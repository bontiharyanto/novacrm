import { Worker } from 'bullmq';
import { createRedisConnection, csatQueueName } from '@/lib/queue/connection';
import { applyOverdueCsatRatings } from '@/lib/csat/auto-rate';
import { scheduleCsatAutoRate } from '@/lib/queue/csat.queue';

export function startCsatWorker() {
  const worker = new Worker(
    csatQueueName,
    async () => {
      const result = await applyOverdueCsatRatings();
      if (!result.ok) {
        throw new Error(result.error ?? 'CSAT auto-rate failed');
      }
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[csat-worker] job ${job?.id} failed`, error.message);
  });

  worker.on('completed', (job, result: { applied?: number }) => {
    if (result?.applied) {
      console.info(`[csat-worker] job ${job.id} auto-rated ${result.applied} ticket(s)`);
    }
  });

  void scheduleCsatAutoRate().catch((error: unknown) => {
    console.error('[csat-worker] schedule failed', error instanceof Error ? error.message : error);
  });

  return worker;
}
