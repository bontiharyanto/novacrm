import type { TicketStatus } from '@/lib/tickets/schema';

export const TICKET_TYPES = ['incident', 'problem', 'change', 'request'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export type ProcessTone = 'danger' | 'warning' | 'info' | 'success';

export const ticketTypeMeta: Record<
  TicketType,
  { label: string; short: string; prefix: string; tone: ProcessTone; description: string }
> = {
  incident: {
    label: 'Incident',
    short: 'INC',
    prefix: 'INC',
    tone: 'danger',
    description: 'Unplanned interruption to a service',
  },
  problem: {
    label: 'Problem',
    short: 'PRB',
    prefix: 'PRB',
    tone: 'warning',
    description: 'Root cause of one or more incidents',
  },
  change: {
    label: 'Change',
    short: 'CHG',
    prefix: 'CHG',
    tone: 'info',
    description: 'Controlled modification to infrastructure',
  },
  request: {
    label: 'Request',
    short: 'RITM',
    prefix: 'RITM',
    tone: 'success',
    description: 'Catalog or access request',
  },
};

export const processStages: Record<TicketType, Array<{ status: TicketStatus; label: string }>> = {
  incident: [
    { status: 'open', label: 'New' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'waiting', label: 'Waiting' },
    { status: 'hold', label: 'On Hold' },
    { status: 'resolved', label: 'Resolved' },
    { status: 'closed', label: 'Closed' },
  ],
  problem: [
    { status: 'open', label: 'New' },
    { status: 'in_progress', label: 'Root Cause' },
    { status: 'waiting', label: 'Pending' },
    { status: 'hold', label: 'Known Error' },
    { status: 'resolved', label: 'Fix Ready' },
    { status: 'closed', label: 'Closed' },
  ],
  change: [
    { status: 'open', label: 'Draft' },
    { status: 'in_progress', label: 'Implement' },
    { status: 'waiting', label: 'CAB Review' },
    { status: 'hold', label: 'Scheduled' },
    { status: 'resolved', label: 'Review' },
    { status: 'closed', label: 'Closed' },
  ],
  request: [
    { status: 'open', label: 'Submitted' },
    { status: 'in_progress', label: 'Fulfillment' },
    { status: 'waiting', label: 'Waiting' },
    { status: 'hold', label: 'On Hold' },
    { status: 'resolved', label: 'Fulfilled' },
    { status: 'closed', label: 'Closed' },
  ],
};

export const queueFilters = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'queue', label: 'My groups' },
  { id: 'unassigned', label: 'Unassigned' },
] as const;

export type QueueFilter = (typeof queueFilters)[number]['id'];

export function isTicketType(value: string | null | undefined): value is TicketType {
  return TICKET_TYPES.includes(value as TicketType);
}

export function displayTicketNumber(number?: string, id?: string) {
  if (number) return number;
  if (id) return `#${id.slice(0, 8)}`;
  return '—';
}

export function stageLabel(type: TicketType, status: TicketStatus) {
  return processStages[type].find((stage) => stage.status === status)?.label ?? status.replace('_', ' ');
}
