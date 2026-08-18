import { Worker } from 'bullmq';
import { createRedisConnection, reportQueueName } from '@/lib/queue/connection';
import { processReportDigestJob, type ReportDigestJob } from '@/lib/queue/report.processor';
import { scheduleReportDigest } from '@/lib/queue/report.queue';

export function startReportWorker() {
  const worker = new Worker<ReportDigestJob>(
    reportQueueName,
    async (job) => processReportDigestJob(job.data ?? {}),
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

  return worker;
}
