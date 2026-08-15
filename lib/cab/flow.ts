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
  if (!ticket.implementationPlan?.trim()) missing.push('implementation plan');
  if (!ticket.backoutPlan?.trim()) missing.push('backout plan');
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
