import { Worker } from 'bullmq';
import { createRedisConnection, csatQueueName } from '@/lib/queue/connection';
import { applyOverdueCsatRatings } from '@/lib/csat/auto-rate';
import { scheduleCsatAutoRate } from '@/lib/queue/csat.queue';
import { applyExpiredTenants } from '@/lib/tenants/auto-pause';

export function startCsatWorker() {
  const worker = new Worker(
    csatQueueName,
    async () => {
      const csat = await applyOverdueCsatRatings();
      if (!csat.ok) {
        throw new Error(csat.error ?? 'CSAT auto-rate failed');
      }
      const tenants = await applyExpiredTenants();
      if (!tenants.ok) {
        throw new Error(tenants.error ?? 'Tenant auto-pause failed');
      }
      return { applied: csat.applied, paused: tenants.paused };
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[csat-worker] job ${job?.id} failed`, error.message);
  });

  worker.on('completed', (job, result: { applied?: number; paused?: number }) => {
    if (result?.applied) {
      console.info(`[csat-worker] job ${job.id} auto-rated ${result.applied} ticket(s)`);
    }
    if (result?.paused) {
      console.info(`[csat-worker] job ${job.id} paused ${result.paused} expired tenant(s)`);
    }
  });

  void scheduleCsatAutoRate().catch((error: unknown) => {
    console.error('[csat-worker] schedule failed', error instanceof Error ? error.message : error);
  });

  return worker;
}
