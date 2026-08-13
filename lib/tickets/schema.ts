import { z } from 'zod';

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const ticketSchema = z.object({
  tenantId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(''),
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
  assetId: z.string().uuid().optional(),
  category: z.string().optional(),
});

export const ticketStatusUpdateSchema = z.object({
  status: ticketStatusSchema,
  assigneeName: z.string().optional(),
  assigneeChatId: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const ticketCommentSchema = z.object({
  author: z.string().min(1),
  comment: z.string().min(1).max(20000),
});

export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
