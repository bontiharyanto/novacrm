import type { BadgeTone } from '@/components/ui/badge';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';

export const ticketStatusTone: Record<TicketStatus, BadgeTone> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export const ticketPriorityTone: Record<TicketPriority, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export const ticketPriorityDotClass: Record<TicketPriority, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  critical: 'bg-rose-400',
};
