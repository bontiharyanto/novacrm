import { Badge } from '@/components/ui/badge';
import { ticketTypeMeta, type TicketType } from '@/lib/tickets/process';

export function TypeBadge({ type }: { type: TicketType }) {
  const meta = ticketTypeMeta[type];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
