import type { WorkflowAction, WorkflowDefinition } from '@/lib/workflows/schema';

export type WorkflowTemplateId =
  | 'standard'
  | 'normal'
  | 'complex'
  | 'inbound-whatsapp'
  | 'inbound-telegram'
  | 'inbound-email'
  | 'inbound-multichannel';

export type WorkflowTemplateGroup = 'starter' | 'inbound';

export type WorkflowTemplate = {
  id: WorkflowTemplateId;
  group: WorkflowTemplateGroup;
  name: string;
  title: string;
  hint: string;
  definition: WorkflowDefinition;
};

function linearInbound(input: {
  id: WorkflowTemplateId;
  name: string;
  title: string;
  hint: string;
  source: 'whatsapp' | 'telegram' | 'email';
  notify: Extract<WorkflowAction, 'send_whatsapp' | 'send_telegram' | 'send_email'>;
  notifyFirst?: boolean;
}): WorkflowTemplate {
  const notifyNode = {
    id: 'action-notify',
    type: 'action' as const,
    position: { x: input.notifyFirst ? 340 : 860, y: 160 },
    data: {
      action: input.notify,
      target: input.notify === 'send_email' ? 'requester' : '',
    },
  };
  const assignNode = {
    id: 'action-assign',
    type: 'action' as const,
    position: { x: input.notifyFirst ? 600 : 340, y: 160 },
    data: { action: 'assign' as const, target: '' },
  };
  const statusNode = {
    id: 'action-status',
    type: 'action' as const,
    position: { x: input.notifyFirst ? 860 : 600, y: 160 },
    data: { action: 'change_status' as const, target: 'in_progress' },
  };
  const sequence = input.notifyFirst ? [notifyNode, assignNode, statusNode] : [assignNode, statusNode, notifyNode];

  return {
    id: input.id,
    group: 'inbound',
    name: input.name,
    title: input.title,
    hint: input.hint,
    definition: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 40, y: 148 },
          data: { event: 'inbound.message', matchCategory: input.source },
        },
        ...sequence,
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: sequence[0].id },
        { id: 'e2', source: sequence[0].id, target: sequence[1].id },
        { id: 'e3', source: sequence[1].id, target: sequence[2].id },
      ],
    },
  };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'standard',
    group: 'starter',
    name: 'Auto assign new ticket',
    title: 'Standard',
    hint: 'Ticket created → WFM dispatch to an eligible agent on the assignment group.',
    definition: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 80, y: 160 },
          data: { event: 'ticket.create' },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 380, y: 160 },
          data: { action: 'assign', target: '' },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'action-1' }],
    },
  },
  {
    id: 'normal',
    group: 'starter',
    name: 'Inbound triage',
    title: 'Normal',
    hint: 'Any inbound channel → assign → in progress → email requester.',
    definition: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 40, y: 180 },
          data: { event: 'inbound.message' },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 300, y: 80 },
          data: { action: 'assign', target: '' },
        },
        {
          id: 'action-2',
          type: 'action',
          position: { x: 300, y: 200 },
          data: { action: 'change_status', target: 'in_progress' },
        },
        {
          id: 'action-3',
          type: 'action',
          position: { x: 300, y: 320 },
          data: { action: 'send_email', target: 'requester' },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'action-1' },
        { id: 'e2', source: 'action-1', target: 'action-2' },
        { id: 'e3', source: 'action-2', target: 'action-3' },
      ],
    },
  },
  {
    id: 'complex',
    group: 'starter',
    name: 'P1 machine alert',
    title: 'Complex',
    hint: 'Monitoring alert → if critical, assign + in progress + notify. Else email only.',
    definition: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 40, y: 200 },
          data: { event: 'alert.received', matchCategory: 'monitoring' },
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 300, y: 180 },
          data: { condition: 'priority', matchValue: 'critical' },
        },
        {
          id: 'action-yes-1',
          type: 'action',
          position: { x: 560, y: 80 },
          data: { action: 'assign', target: '' },
        },
        {
          id: 'action-yes-2',
          type: 'action',
          position: { x: 560, y: 180 },
          data: { action: 'change_status', target: 'in_progress' },
        },
        {
          id: 'action-yes-3',
          type: 'action',
          position: { x: 800, y: 130 },
          data: { action: 'send_email', target: 'assignee' },
        },
        {
          id: 'action-no-1',
          type: 'action',
          position: { x: 560, y: 340 },
          data: { action: 'send_email', target: 'requester' },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'condition-1' },
        { id: 'e-yes-1', source: 'condition-1', target: 'action-yes-1', sourceHandle: 'yes' },
        { id: 'e-yes-2', source: 'action-yes-1', target: 'action-yes-2' },
        { id: 'e-yes-3', source: 'action-yes-2', target: 'action-yes-3' },
        { id: 'e-no-1', source: 'condition-1', target: 'action-no-1', sourceHandle: 'no' },
      ],
    },
  },
  linearInbound({
    id: 'inbound-whatsapp',
    name: 'WhatsApp inbound',
    title: 'WhatsApp',
    hint: 'WhatsApp message → WFM assign → in progress → reply on WhatsApp.',
    source: 'whatsapp',
    notify: 'send_whatsapp',
  }),
  linearInbound({
    id: 'inbound-telegram',
    name: 'Telegram inbound',
    title: 'Telegram',
    hint: 'Telegram message → reply on the inbound chat → WFM assign → in progress.',
    source: 'telegram',
    notify: 'send_telegram',
    notifyFirst: true,
  }),
  linearInbound({
    id: 'inbound-email',
    name: 'Email inbound',
    title: 'Email',
    hint: 'Inbound email → WFM assign → in progress → email requester.',
    source: 'email',
    notify: 'send_email',
  }),
  {
    id: 'inbound-multichannel',
    group: 'inbound',
    name: 'Multichannel inbound',
    title: 'Multichannel',
    hint: 'WA / Telegram / email → assign → in progress → reply on the same channel.',
    definition: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 40, y: 220 },
          data: { event: 'inbound.message' },
        },
        {
          id: 'action-assign',
          type: 'action',
          position: { x: 300, y: 220 },
          data: { action: 'assign', target: '' },
        },
        {
          id: 'action-status',
          type: 'action',
          position: { x: 540, y: 220 },
          data: { action: 'change_status', target: 'in_progress' },
        },
        {
          id: 'condition-wa',
          type: 'condition',
          position: { x: 780, y: 200 },
          data: { condition: 'category', matchValue: 'whatsapp' },
        },
        {
          id: 'action-wa',
          type: 'action',
          position: { x: 1040, y: 80 },
          data: { action: 'send_whatsapp', target: '' },
        },
        {
          id: 'condition-tg',
          type: 'condition',
          position: { x: 1040, y: 280 },
          data: { condition: 'category', matchValue: 'telegram' },
        },
        {
          id: 'action-tg',
          type: 'action',
          position: { x: 1300, y: 200 },
          data: { action: 'send_telegram', target: '' },
        },
        {
          id: 'action-email',
          type: 'action',
          position: { x: 1300, y: 380 },
          data: { action: 'send_email', target: 'requester' },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'action-assign' },
        { id: 'e2', source: 'action-assign', target: 'action-status' },
        { id: 'e3', source: 'action-status', target: 'condition-wa' },
        { id: 'e-wa-yes', source: 'condition-wa', target: 'action-wa', sourceHandle: 'yes' },
        { id: 'e-wa-no', source: 'condition-wa', target: 'condition-tg', sourceHandle: 'no' },
        { id: 'e-tg-yes', source: 'condition-tg', target: 'action-tg', sourceHandle: 'yes' },
        { id: 'e-tg-no', source: 'condition-tg', target: 'action-email', sourceHandle: 'no' },
      ],
    },
  },
];

export const WORKFLOW_TEMPLATE_GROUPS: Array<{ id: WorkflowTemplateGroup; label: string; hint: string }> = [
  { id: 'starter', label: 'Starters', hint: 'One trigger, a sequence, or an if/else alert.' },
  { id: 'inbound', label: 'Inbound channels', hint: 'WhatsApp, Telegram, email, or all three in one flow.' },
];

export function templatesInGroup(group: WorkflowTemplateGroup) {
  return WORKFLOW_TEMPLATES.filter((item) => item.group === group);
}

export function getWorkflowTemplate(id: string | undefined) {
  return WORKFLOW_TEMPLATES.find((item) => item.id === id) ?? WORKFLOW_TEMPLATES[0];
}
