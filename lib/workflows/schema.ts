import { z } from 'zod';

export const workflowEventSchema = z.enum([
  'ticket.create',
  'ticket.status_change',
  'ticket.comment_add',
  'alert.received',
  'inbound.message',
]);
export const workflowActionSchema = z.enum([
  'send_email',
  'assign',
  'change_status',
  'create_asset',
  'create_ticket',
  'send_whatsapp',
  'send_telegram',
]);
export const workflowComplexitySchema = z.enum(['standard', 'normal', 'complex']);
export const workflowConditionFieldSchema = z.enum(['priority', 'type', 'status', 'category']);

export const workflowNodeDataSchema = z.object({
  event: workflowEventSchema.optional(),
  matchPriority: z.string().optional(),
  matchType: z.string().optional(),
  matchCategory: z.string().optional(),
  action: workflowActionSchema.optional(),
  target: z.string().optional(),
  condition: workflowConditionFieldSchema.optional(),
  matchValue: z.string().optional(),
  label: z.string().optional(),
});

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger', 'action', 'condition']),
  position: z.object({ x: z.number(), y: z.number() }),
  data: workflowNodeDataSchema,
});

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  event: workflowEventSchema.default('ticket.create'),
  action: workflowActionSchema.default('send_email'),
  target: z.string().optional(),
  isActive: z.boolean().optional(),
  definition: workflowDefinitionSchema.optional(),
});

export const workflowUpdateSchema = workflowSchema.partial();

export type WorkflowEvent = z.infer<typeof workflowEventSchema>;
export type WorkflowAction = z.infer<typeof workflowActionSchema>;
export type WorkflowComplexity = z.infer<typeof workflowComplexitySchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

export type WorkflowTicketContext = {
  priority?: string;
  type?: string;
  status?: string;
  category?: string;
};

export type WorkflowRule = {
  id: string;
  tenantId: string;
  name: string;
  event: WorkflowEvent;
  action: WorkflowAction;
  target?: string;
  isActive: boolean;
  complexity: WorkflowComplexity;
  definition: WorkflowDefinition;
  createdAt: string;
};

export type WorkflowRun = {
  id: string;
  ruleId?: string;
  ticketId?: string;
  event: string;
  status: string;
  result: Record<string, unknown>;
  createdAt: string;
};

export const WORKFLOW_EVENTS: Array<{ id: WorkflowEvent; label: string; hint: string }> = [
  { id: 'ticket.create', label: 'Ticket created', hint: 'When a ticket is opened' },
  { id: 'ticket.status_change', label: 'Status changed', hint: 'When process state moves' },
  { id: 'ticket.comment_add', label: 'Comment added', hint: 'When activity is posted' },
  { id: 'alert.received', label: 'Machine alert', hint: 'Prometheus / Grafana / monitoring' },
  { id: 'inbound.message', label: 'Inbound message', hint: 'WhatsApp, Telegram, or email' },
];

export const WORKFLOW_ACTIONS: Array<{ id: WorkflowAction; label: string; hint: string }> = [
  { id: 'send_email', label: 'Send email', hint: 'Notify requester or assignee' },
  { id: 'send_whatsapp', label: 'Send WhatsApp', hint: 'Reply on WhatsApp' },
  { id: 'send_telegram', label: 'Send Telegram', hint: 'Reply on Telegram' },
  { id: 'assign', label: 'Assign', hint: 'Set the assignee' },
  { id: 'change_status', label: 'Change status', hint: 'Move process state' },
  { id: 'create_ticket', label: 'Create ticket', hint: 'Open an incident if none exists' },
  { id: 'create_asset', label: 'Create asset', hint: 'Open an ITAM record' },
];

export const WORKFLOW_COMPLEXITY: Array<{ id: WorkflowComplexity; label: string; hint: string }> = [
  { id: 'standard', label: 'Standard', hint: 'One trigger, one action' },
  { id: 'normal', label: 'Normal', hint: 'Several steps in sequence' },
  { id: 'complex', label: 'Complex', hint: 'Conditions and branching' },
];
