import type { WorkflowDefinition } from '@/lib/workflows/schema';

export type WorkflowTemplateId = 'standard' | 'normal' | 'complex';

export type WorkflowTemplate = {
  id: WorkflowTemplateId;
  name: string;
  title: string;
  hint: string;
  definition: WorkflowDefinition;
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'standard',
    name: 'Auto assign new ticket',
    title: 'Standard',
    hint: 'Ticket created → assign to first agent. One trigger, one action.',
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
    name: 'Inbound triage',
    title: 'Normal',
    hint: 'WhatsApp / Telegram / email → assign → in progress → notify requester.',
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
];

export function getWorkflowTemplate(id: string | undefined) {
  return WORKFLOW_TEMPLATES.find((item) => item.id === id) ?? WORKFLOW_TEMPLATES[0];
}
