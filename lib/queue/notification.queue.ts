import { createHash } from 'crypto';
import { Queue } from 'bullmq';
import { createRedisConnection, notificationQueueName } from '@/lib/queue/connection';
import { processNotificationJob } from '@/lib/queue/notification.processor';
import type { NotificationJobPayload } from '@/lib/notifications/types';

let queue: Queue<NotificationJobPayload> | null = null;

function getNotificationQueue() {
  if (!queue) {
    queue = new Queue<NotificationJobPayload>(notificationQueueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    });
  }
  return queue;
}

export function buildNotificationJobId(payload: NotificationJobPayload) {
  if (payload.event === 'ticket.create') {
    return `notify:create:${payload.ticketId}`;
  }
  if (payload.event === 'ticket.status_change') {
    return `notify:status:${payload.ticketId}:${payload.status ?? 'unknown'}`;
  }
  const digest = createHash('sha1').update(payload.message ?? '').digest('hex').slice(0, 12);
  return `notify:comment:${payload.ticketId}:${digest}`;
}

function isDuplicateJob(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('already exists') || message.toLowerCase().includes('jobid');
}

export async function enqueueNotification(payload: NotificationJobPayload) {
  const jobId = buildNotificationJobId(payload);

  try {
    const job = await getNotificationQueue().add('notification', payload, { jobId });
    return { ok: true, id: job.id, queued: true, duplicate: false };
  } catch (error) {
    if (isDuplicateJob(error)) {
      return { ok: true, id: jobId, queued: true, duplicate: true };
    }

    const fallback = await processNotificationJob(payload);
    return {
      ok: Boolean(fallback.ok),
      id: jobId,
      queued: false,
      duplicate: false,
      error: error instanceof Error ? error.message : 'queue unavailable, processed inline',
    };
  }
}
