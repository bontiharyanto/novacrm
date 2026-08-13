import { Worker } from 'bullmq';
import { createRedisConnection, notificationQueueName } from '@/lib/queue/connection';
import { processNotificationJob } from '@/lib/queue/notification.processor';
import type { NotificationJobPayload } from '@/lib/notifications/types';

export { processNotificationJob } from '@/lib/queue/notification.processor';
export type { NotificationJobPayload } from '@/lib/notifications/types';

export function startNotificationWorker() {
  const worker = new Worker<NotificationJobPayload>(
    notificationQueueName,
    async (job) => {
      const result = await processNotificationJob(job.data);
      if (!result.ok) {
        throw new Error(result.error ?? 'Notification job failed');
      }
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[notification-worker] job ${job?.id} failed`, error.message);
  });

  worker.on('completed', (job) => {
    console.info(`[notification-worker] job ${job.id} sent`);
  });

  return worker;
}
