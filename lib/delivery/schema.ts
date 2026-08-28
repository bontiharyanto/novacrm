import { z } from 'zod';
import { optionalUuidSchema } from '@/lib/validation/id';

export const deliveryProjectStatusSchema = z.enum([
  'planned',
  'in_progress',
  'blocked',
  'completed',
  'cancelled',
]);
export type DeliveryProjectStatus = z.infer<typeof deliveryProjectStatusSchema>;

export const deliveryExecutionModeSchema = z.enum(['sequential', 'parallel']);
export type DeliveryExecutionMode = z.infer<typeof deliveryExecutionModeSchema>;

export const deliveryPhaseStatusSchema = deliveryProjectStatusSchema;
export type DeliveryPhaseStatus = z.infer<typeof deliveryPhaseStatusSchema>;

export const deliveryProjectInputSchema = z.object({
  accountId: z.string().uuid(),
  externalProvider: z.string().trim().min(2).max(80).default('work_order_crm'),
  externalId: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2).max(200),
  description: z.string().max(4000).optional().default(''),
  status: deliveryProjectStatusSchema.default('planned'),
  executionMode: deliveryExecutionModeSchema.default('sequential'),
  pmId: optionalUuidSchema,
  dcoId: optionalUuidSchema,
  plannedStart: z.string().date().optional(),
  plannedEnd: z.string().date().optional(),
  templateKey: z.enum(['standard_delivery']).default('standard_delivery'),
});

export const deliveryProjectUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(4000).optional(),
  status: deliveryProjectStatusSchema.optional(),
  executionMode: deliveryExecutionModeSchema.optional(),
  pmId: optionalUuidSchema,
  dcoId: optionalUuidSchema,
  plannedStart: z.string().date().nullable().optional(),
  plannedEnd: z.string().date().nullable().optional(),
});

export const deliveryPhaseUpdateSchema = z.object({
  status: deliveryPhaseStatusSchema.optional(),
  customerVisible: z.boolean().optional(),
  plannedStart: z.string().date().nullable().optional(),
  plannedEnd: z.string().date().nullable().optional(),
});

export const deliveryWorkOrderInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(4000).optional().default(''),
});

export type DeliveryProjectInput = z.infer<typeof deliveryProjectInputSchema>;
export type DeliveryProjectUpdate = z.infer<typeof deliveryProjectUpdateSchema>;
export type DeliveryPhaseUpdate = z.infer<typeof deliveryPhaseUpdateSchema>;
export type DeliveryWorkOrderInput = z.infer<typeof deliveryWorkOrderInputSchema>;

export type DeliveryPhase = {
  id: string;
  projectId: string;
  workOrderId?: string;
  phaseKey: string;
  title: string;
  status: DeliveryPhaseStatus;
  sortOrder: number;
  customerVisible: boolean;
  plannedStart?: string;
  plannedEnd?: string;
  completedAt?: string;
};

export type DeliveryWorkOrder = {
  id: string;
  projectId: string;
  ticketId?: string;
  externalProvider: string;
  externalId: string;
  number: string;
  title: string;
  status: DeliveryPhaseStatus;
};

export type DeliveryProject = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName?: string;
  externalProvider: string;
  externalId: string;
  name: string;
  description: string;
  status: DeliveryProjectStatus;
  executionMode: DeliveryExecutionMode;
  pmId?: string;
  pmName?: string;
  dcoId?: string;
  dcoName?: string;
  plannedStart?: string;
  plannedEnd?: string;
  completedAt?: string;
  progress: number;
  phases: DeliveryPhase[];
  workOrders: DeliveryWorkOrder[];
  createdAt: string;
  updatedAt: string;
};

export type DeliveryWebhookPayload = {
  eventId: string;
  eventType: 'project.created' | 'project.updated' | 'work_order.created' | 'work_order.updated';
  project: {
    externalId: string;
    accountExternalId?: string;
    accountId?: string;
    name: string;
    description?: string;
    status?: DeliveryProjectStatus;
    executionMode?: DeliveryExecutionMode;
    pmExternalId?: string;
    dcoExternalId?: string;
    plannedStart?: string;
    plannedEnd?: string;
  };
  workOrder?: {
    externalId: string;
    number: string;
    title: string;
    status?: DeliveryPhaseStatus;
  };
  phases?: Array<{
    key: string;
    title: string;
    status?: DeliveryPhaseStatus;
    sortOrder?: number;
    customerVisible?: boolean;
    plannedStart?: string;
    plannedEnd?: string;
  }>;
};

export const deliveryWebhookPayloadSchema: z.ZodType<DeliveryWebhookPayload> = z.object({
  eventId: z.string().trim().min(1).max(160),
  eventType: z.enum(['project.created', 'project.updated', 'work_order.created', 'work_order.updated']),
  project: z.object({
    externalId: z.string().trim().min(1).max(160),
    accountExternalId: z.string().trim().max(160).optional(),
    accountId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(200),
    description: z.string().max(4000).optional(),
    status: deliveryProjectStatusSchema.optional(),
    executionMode: deliveryExecutionModeSchema.optional(),
    pmExternalId: z.string().trim().max(160).optional(),
    dcoExternalId: z.string().trim().max(160).optional(),
    plannedStart: z.string().date().optional(),
    plannedEnd: z.string().date().optional(),
  }),
  workOrder: z
    .object({
      externalId: z.string().trim().min(1).max(160),
      number: z.string().trim().min(1).max(80),
      title: z.string().trim().min(2).max(200),
      status: deliveryPhaseStatusSchema.optional(),
    })
    .optional(),
  phases: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(200),
        status: deliveryPhaseStatusSchema.optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        customerVisible: z.boolean().optional(),
        plannedStart: z.string().date().optional(),
        plannedEnd: z.string().date().optional(),
      }),
    )
    .max(100)
    .optional(),
});
