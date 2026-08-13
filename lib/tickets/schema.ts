import { z } from 'zod';
import { TICKET_PENDING_REASONS } from '@/lib/tickets/pending';

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ticketTypeSchema = z.enum(['incident', 'problem', 'change', 'request']);
export const ticketPendingReasonSchema = z.enum(TICKET_PENDING_REASONS);

export const ticketSchema = z.object({
  tenantId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(''),
  type: ticketTypeSchema.default('incident'),
  status: ticketStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  dueDate: z.string().optional(),
  requesterName: z.string().min(1).default('Customer'),
  requesterEmail: z.string().email().optional(),
  requesterPhone: z.string().optional(),
  assigneeName: z.string().optional(),
  assigneeChatId: z.string().optional(),
  requesterId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  category: z.string().optional(),
  catalogItemId: z.string().uuid().optional(),
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
  assigneeId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  pendingReason: ticketPendingReasonSchema.nullable().optional(),
  pendingNote: z.string().max(200).nullable().optional(),
  escalate: z.boolean().optional(),
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
