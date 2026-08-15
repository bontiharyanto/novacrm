import { z } from 'zod';
import { TICKET_PENDING_REASONS } from '@/lib/tickets/pending';
import { nullableUuidSchema, optionalEmailSchema, optionalUuidSchema } from '@/lib/validation/id';

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ticketTypeSchema = z.enum(['incident', 'problem', 'change', 'request']);
export const ticketPendingReasonSchema = z.enum(TICKET_PENDING_REASONS);

export const ticketSchema = z.object({
  tenantId: optionalUuidSchema,
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(''),
  type: ticketTypeSchema.default('incident'),
  status: ticketStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  dueDate: z.string().optional(),
  requesterName: z.string().min(1).default('Customer'),
  requesterEmail: optionalEmailSchema,
  requesterPhone: z.string().optional(),
  assigneeName: z.string().optional(),
  assigneeChatId: z.string().optional(),
  requesterId: optionalUuidSchema,
  assigneeId: optionalUuidSchema,
  accountId: optionalUuidSchema,
  assetId: optionalUuidSchema,
  groupId: optionalUuidSchema,
  category: z.string().optional(),
  catalogItemId: optionalUuidSchema,
  catalogAnswers: z.record(z.string(), z.string()).optional(),
  changeType: z.enum(['standard', 'normal', 'emergency']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  implementationPlan: z.string().max(8000).optional(),
  backoutPlan: z.string().max(8000).optional(),
});

export const ticketUpdateSchema = z.object({
  status: ticketStatusSchema.optional(),
  type: ticketTypeSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeName: z.string().optional(),
  assigneeChatId: z.string().optional(),
  assigneeId: nullableUuidSchema,
  assetId: nullableUuidSchema,
  groupId: nullableUuidSchema,
  pendingReason: ticketPendingReasonSchema.nullable().optional(),
  pendingNote: z.string().max(200).nullable().optional(),
  escalate: z.boolean().optional(),
  problemId: nullableUuidSchema,
  workaround: z.string().max(4000).nullable().optional(),
  knownError: z.boolean().optional(),
});

export const ticketStatusUpdateSchema = ticketUpdateSchema;

export const ticketCommentSchema = z.object({
  author: z.string().min(1),
  comment: z.string().min(1).max(20000),
});

export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketType = z.infer<typeof ticketTypeSchema>;
export type TicketPendingReason = z.infer<typeof ticketPendingReasonSchema>;
