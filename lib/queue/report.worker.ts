import { Worker } from 'bullmq';
import { createRedisConnection, reportQueueName } from '@/lib/queue/connection';
import {
  processDeliveryProjectSnapshotJob,
  processReportDigestJob,
  type DeliverySnapshotJob,
  type ReportDigestJob,
} from '@/lib/queue/report.processor';
import { enqueueDeliveryProjectSnapshot, scheduleReportDigest } from '@/lib/queue/report.queue';

export function startReportWorker() {
  const worker = new Worker<ReportDigestJob | DeliverySnapshotJob>(
    reportQueueName,
    async (job) =>
      job.name === 'delivery-snapshot'
        ? processDeliveryProjectSnapshotJob(job.data as DeliverySnapshotJob)
        : processReportDigestJob(job.data as ReportDigestJob),
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[report-worker] job ${job?.id} failed`, error.message);
  });

  worker.on('completed', (job, result: { sent?: number }) => {
    if (result?.sent) {
      console.info(`[report-worker] job ${job.id} sent ${result.sent} digest(s)`);
    }
  });

  void scheduleReportDigest().catch((error: unknown) => {
    console.error('[report-worker] schedule failed', error instanceof Error ? error.message : error);
  });
  void enqueueDeliveryProjectSnapshot().catch((error: unknown) => {
    console.error('[report-worker] initial delivery snapshot failed', error instanceof Error ? error.message : error);
  });

  return worker;
}
