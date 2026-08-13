import { createHash } from 'crypto';
import { Queue } from 'bullmq';
import { createRedisConnection, workflowQueueName } from '@/lib/queue/connection';
import { processWorkflowJob, type WorkflowJobPayload } from '@/lib/queue/workflow.processor';

let queue: Queue<WorkflowJobPayload> | null = null;

function getWorkflowQueue() {
  if (!queue) {
    queue = new Queue<WorkflowJobPayload>(workflowQueueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 500 },
        removeOnFail: { age: 86400, count: 500 },
      },
    });
  }
  return queue;
}

function jobId(payload: WorkflowJobPayload) {
  const digest = createHash('sha1')
    .update(`${payload.event}:${payload.ticket.status}:${payload.ticket.assigneeId ?? ''}`)
    .digest('hex')
    .slice(0, 10);
  return `wf:${payload.ruleId}:${payload.ticketId}:${digest}`;
}

function isDuplicate(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('already exists') || message.toLowerCase().includes('jobid');
}

export async function enqueueWorkflow(payload: WorkflowJobPayload) {
  try {
    const id = jobId(payload);
    const job = await getWorkflowQueue().add('workflow', payload, { jobId: id });
    return { ok: true, id: job.id };
  } catch (error) {
    if (isDuplicate(error)) {
      return { ok: true, id: jobId(payload), duplicate: true };
    }
    const fallback = await processWorkflowJob(payload);
    return { ok: fallback.ok, error: fallback.error };
  }
}
