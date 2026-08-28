import { z } from 'zod';
import { ticketTaskStatusSchema } from '@/lib/tickets/tasks-schema';

export const taskActivityKindSchema = z.enum([
  'progress',
  'comment',
  'blocker',
  'decision',
  'status_change',
  'handover',
]);
export type TaskActivityKind = z.infer<typeof taskActivityKindSchema>;

export const taskActivityCreateSchema = z.object({
  kind: taskActivityKindSchema.default('progress'),
  body: z.string().trim().min(1).max(5000),
  customerVisible: z.boolean().default(false),
  statusFrom: ticketTaskStatusSchema.optional(),
  statusTo: ticketTaskStatusSchema.optional(),
});

export type TaskActivity = {
  id: string;
  tenantId: string;
  taskId: string;
  actorId?: string;
  actorName?: string;
  kind: TaskActivityKind;
  body: string;
  statusFrom?: string;
  statusTo?: string;
  customerVisible: boolean;
  createdAt: string;
  createdBy?: string;
};

export type TaskActivityCreate = z.infer<typeof taskActivityCreateSchema>;

export const taskDependencyCreateSchema = z.object({
  predecessorTaskId: z.string().uuid(),
  dependencyType: z.literal('finish_to_start').default('finish_to_start'),
});

export type TaskDependency = {
  id: string;
  tenantId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: 'finish_to_start';
  createdAt: string;
  createdBy?: string;
};
