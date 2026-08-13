import { Worker } from 'bullmq';
import { createRedisConnection, workflowQueueName } from '@/lib/queue/connection';
import { processWorkflowJob, type WorkflowJobPayload } from '@/lib/queue/workflow.processor';

export function startWorkflowWorker() {
  const worker = new Worker<WorkflowJobPayload>(
    workflowQueueName,
    async (job) => {
      const result = await processWorkflowJob(job.data);
      if (!result.ok) {
        throw new Error(result.error ?? 'Workflow job failed');
      }
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[workflow-worker] job ${job?.id} failed`, error.message);
  });

  worker.on('completed', (job) => {
    console.info(`[workflow-worker] job ${job.id} ran`);
  });

  return worker;
}
