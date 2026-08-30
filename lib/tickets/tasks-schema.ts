import { z } from 'zod';
import type { TicketType } from '@/lib/tickets/schema';

export const ticketTaskStatusSchema = z.enum(['open', 'in_progress', 'done', 'cancelled']);
export type TicketTaskStatus = z.infer<typeof ticketTaskStatusSchema>;

export const ticketTaskTypeSchema = z.enum([
  // Request / shared fulfillment
  'feasibility',
  'allocate',
  'install',
  'provision',
  'test',
  'validate_ci',
  'handover',
  'fulfillment_other',
  // Change
  'implement',
  'backout',
  'pir',
  // Incident / problem
  'investigate',
  'fix',
  'vendor',
  'onsite',
  'communicate',
  'repro',
  'workaround',
  'known_error',
  'root_cause',
  'other',
]);
export type TicketTaskType = z.infer<typeof ticketTaskTypeSchema>;

export const catalogFulfillmentStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  taskType: ticketTaskTypeSchema.default('other'),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export type CatalogFulfillmentStep = z.infer<typeof catalogFulfillmentStepSchema>;

export const ticketTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  taskType: ticketTaskTypeSchema.default('other'),
  groupId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const ticketTaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  taskType: ticketTaskTypeSchema.optional(),
  status: ticketTaskStatusSchema.optional(),
  groupId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export type TicketTask = {
  id: string;
  tenantId: string;
  ticketId: string;
  number: string;
  title: string;
  taskType: TicketTaskType;
  status: TicketTaskStatus;
  groupId?: string;
  groupName?: string;
  assigneeId?: string;
  assigneeName?: string;
  sortOrder: number;
  startedAt?: string;
  completedAt?: string;
  customerVisible?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  locked?: boolean;
  blockerCount?: number;
};

export const REQUEST_TASK_TYPES: TicketTaskType[] = [
  'feasibility',
  'allocate',
  'install',
  'provision',
  'test',
  'validate_ci',
  'handover',
  'fulfillment_other',
  'other',
];

export const CHANGE_TASK_TYPES: TicketTaskType[] = [
  'implement',
  'test',
  'backout',
  'validate_ci',
  'pir',
  'handover',
  'other',
];

export const INCIDENT_TASK_TYPES: TicketTaskType[] = [
  'investigate',
  'fix',
  'vendor',
  'onsite',
  'communicate',
  'other',
];

export const PROBLEM_TASK_TYPES: TicketTaskType[] = [
  'investigate',
  'repro',
  'workaround',
  'known_error',
  'root_cause',
  'other',
];

export function taskTypesForTicketType(type: TicketType): TicketTaskType[] {
  if (type === 'request') return REQUEST_TASK_TYPES;
  if (type === 'change') return CHANGE_TASK_TYPES;
  if (type === 'problem') return PROBLEM_TASK_TYPES;
  return INCIDENT_TASK_TYPES;
}

export const DEFAULT_CHANGE_STEPS: CatalogFulfillmentStep[] = [
  { title: 'Implement change', taskType: 'implement', sortOrder: 0 },
  { title: 'Test change', taskType: 'test', sortOrder: 1 },
  { title: 'Backout readiness', taskType: 'backout', sortOrder: 2 },
];

export const DEFAULT_REQUEST_PIPELINE: CatalogFulfillmentStep[] = [
  { title: 'Determine customer order feasibility (survey)', taskType: 'feasibility', sortOrder: 0 },
  { title: 'Allocate resource & service', taskType: 'allocate', sortOrder: 1 },
  { title: 'Install & activate resource', taskType: 'install', sortOrder: 2 },
  { title: 'Service provisioning', taskType: 'provision', sortOrder: 3 },
  { title: 'Test service end-to-end', taskType: 'test', sortOrder: 4 },
  { title: 'CI verification & validation', taskType: 'validate_ci', sortOrder: 5 },
  { title: 'Handover to operation', taskType: 'handover', sortOrder: 6 },
];

export function parseFulfillmentSteps(value: unknown): CatalogFulfillmentStep[] {
  if (!Array.isArray(value)) return [];
  const rows: CatalogFulfillmentStep[] = [];
  value.forEach((raw, index) => {
    const parsed = catalogFulfillmentStepSchema.safeParse({
      ...(typeof raw === 'object' && raw ? raw : {}),
      sortOrder:
        typeof raw === 'object' && raw && 'sortOrder' in raw
          ? (raw as { sortOrder?: number }).sortOrder
          : index,
    });
    if (parsed.success) rows.push(parsed.data);
  });
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isTaskTerminal(status: TicketTaskStatus) {
  return status === 'done' || status === 'cancelled';
}
