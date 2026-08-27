import type { TicketStatus } from '@/lib/tickets/schema';
import type { ChangeType } from '@/lib/cab/schema';

export function nextStatusForDecision(decision: 'approved' | 'rejected' | 'deferred', changeType?: ChangeType): TicketStatus | null {
  if (decision === 'deferred') return null;
  if (decision === 'rejected') return 'open';
  if (changeType === 'emergency') return 'in_progress';
  return 'hold';
}

export function submitStatusForChange(changeType?: ChangeType): TicketStatus {
  if (changeType === 'standard') return 'hold';
  return 'waiting';
}

function hasPlanText(value?: string | null) {
  if (!value?.trim()) return false;
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export function changeReadyForCab(ticket: {
  changeType?: ChangeType | null;
  riskLevel?: string | null;
  implementationPlan?: string | null;
  backoutPlan?: string | null;
}) {
  if (ticket.changeType === 'standard') {
    return { ok: true, missing: [] as string[] };
  }
  const missing: string[] = [];
  if (!ticket.riskLevel) missing.push('risk');
  if (!hasPlanText(ticket.implementationPlan)) missing.push('implementation plan');
  if (!hasPlanText(ticket.backoutPlan)) missing.push('backout plan');
  return { ok: missing.length === 0, missing };
}

export function cabQueue(status: TicketStatus) {
  if (status === 'waiting') return 'review';
  if (status === 'hold') return 'scheduled';
  if (status === 'in_progress') return 'implement';
  if (status === 'open') return 'draft';
  if (status === 'resolved' || status === 'closed') return 'done';
  return 'other';
}
