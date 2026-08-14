import { createHash } from 'crypto';
import { Queue } from 'bullmq';
import { createRedisConnection, wfmQueueName } from '@/lib/queue/connection';
import { processWfmDispatchJob, type WfmDispatchJob } from '@/lib/queue/wfm.processor';

let queue: Queue<WfmDispatchJob> | null = null;

function getQueue() {
  if (!queue) {
    queue = new Queue<WfmDispatchJob>(wfmQueueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: { age: 3600, count: 400 },
        removeOnFail: { age: 86400, count: 400 },
      },
    });
  }
  return queue;
}

function jobId(payload: WfmDispatchJob) {
  const digest = createHash('sha1').update(`${payload.ticketId}:${payload.force ? '1' : '0'}`).digest('hex').slice(0, 10);
  return `wfm:${payload.tenantId}:${payload.ticketId}:${digest}`;
}

function isDuplicate(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('already exists') || message.toLowerCase().includes('jobid');
}

export async function enqueueWfmDispatch(payload: WfmDispatchJob) {
  try {
    const id = jobId(payload);
    const job = await getQueue().add('dispatch', payload, { jobId: id });
    return { ok: true, id: job.id };
  } catch (error) {
    if (isDuplicate(error)) return { ok: true, id: jobId(payload), duplicate: true };
    const fallback = await processWfmDispatchJob(payload);
    return { ok: fallback.ok, error: fallback.error };
  }
}
