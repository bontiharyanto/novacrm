import type { TicketStatus, TicketType } from '@/lib/tickets/schema';

export const TICKET_PENDING_REASONS = ['customer', 'vendor', 'change_freeze'] as const;
export type TicketPendingReason = (typeof TICKET_PENDING_REASONS)[number];

export const SUPPORT_TIERS = ['l1', 'l2', 'l3'] as const;
export type SupportTier = (typeof SUPPORT_TIERS)[number];

export const pendingReasonLabel: Record<TicketPendingReason, string> = {
  customer: 'Waiting on customer',
  vendor: 'Pending vendor',
  change_freeze: 'Change freeze',
};

export const supportTierLabel: Record<SupportTier, string> = {
  l1: 'L1',
  l2: 'L2',
  l3: 'L3',
};

export function isPendingReason(value: string | null | undefined): value is TicketPendingReason {
  return TICKET_PENDING_REASONS.includes(value as TicketPendingReason);
}

export function isSupportTier(value: string | null | undefined): value is SupportTier {
  return SUPPORT_TIERS.includes(value as SupportTier);
}

export function defaultPendingReason(status: TicketStatus, type: TicketType): TicketPendingReason | null {
  if (status !== 'waiting' && status !== 'hold') return null;
  if (status === 'waiting') return type === 'change' ? 'change_freeze' : 'customer';
  return type === 'change' ? 'change_freeze' : 'vendor';
}

export function isPauseStatus(status: TicketStatus) {
  return status === 'waiting' || status === 'hold';
}
