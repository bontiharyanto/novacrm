import { Queue } from 'bullmq';
import { createRedisConnection, reportQueueName } from '@/lib/queue/connection';
import { processReportDigestJob, type ReportDigestJob } from '@/lib/queue/report.processor';

let queue: Queue<ReportDigestJob> | null = null;

function getQueue() {
  if (!queue) {
    queue = new Queue<ReportDigestJob>(reportQueueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 4000 },
        removeOnComplete: { age: 86400, count: 200 },
        removeOnFail: { age: 86400, count: 200 },
      },
    });
  }
  return queue;
}

export async function scheduleReportDigest() {
  await getQueue().upsertJobScheduler(
    'report-daily-digest',
    { every: 15 * 60 * 1000 },
    { name: 'digest', data: {} },
  );
}

export async function enqueueReportDigest(payload: ReportDigestJob = {}) {
  try {
    const job = await getQueue().add('digest', payload);
    return { ok: true, id: job.id, queued: true };
  } catch (error) {
    const fallback = await processReportDigestJob(payload);
    return {
      ok: Boolean(fallback.ok),
      queued: false,
      sent: fallback.sent,
      error: fallback.error ?? (error instanceof Error ? error.message : 'queue unavailable'),
    };
  }
}
