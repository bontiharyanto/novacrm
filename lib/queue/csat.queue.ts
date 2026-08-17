import { Queue } from 'bullmq';
import { createRedisConnection, csatQueueName } from '@/lib/queue/connection';

let queue: Queue | null = null;

function getQueue() {
  if (!queue) {
    queue = new Queue(csatQueueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400, count: 200 },
        removeOnFail: { age: 86400, count: 200 },
      },
    });
  }
  return queue;
}

export async function scheduleCsatAutoRate() {
  await getQueue().upsertJobScheduler(
    'csat-auto-rate',
    { every: 60 * 60 * 1000 },
    { name: 'auto-rate', data: {} },
  );
  await getQueue().add('auto-rate', {});
}
