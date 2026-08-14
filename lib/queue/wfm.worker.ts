import { Worker } from 'bullmq';
import { createRedisConnection, wfmQueueName } from '@/lib/queue/connection';
import { processWfmDispatchJob, type WfmDispatchJob } from '@/lib/queue/wfm.processor';

export function startWfmWorker() {
  const worker = new Worker<WfmDispatchJob>(
    wfmQueueName,
    async (job) => {
      const result = await processWfmDispatchJob(job.data);
      if (!result.ok) throw new Error(result.error ?? 'WFM dispatch failed');
      return result;
    },
    { connection: createRedisConnection(), concurrency: 4 },
  );

  worker.on('failed', (job, error) => {
    console.error(`[wfm-worker] job ${job?.id} failed`, error.message);
  });

  return worker;
}
