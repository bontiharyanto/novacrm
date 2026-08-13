import { Badge } from '@/components/ui/badge';
import { pendingReasonLabel, type TicketPendingReason } from '@/lib/tickets/pending';

const tone: Record<TicketPendingReason, 'info' | 'warning'> = {
  customer: 'info',
  vendor: 'warning',
  change_freeze: 'warning',
};

export function PendingBadge({
  reason,
  note,
}: {
  reason?: TicketPendingReason | null;
  note?: string | null;
}) {
  if (!reason) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={tone[reason]}>{pendingReasonLabel[reason]}</Badge>
      {note ? <span className="font-mono text-[10px] text-zinc-500">{note}</span> : null}
    </span>
  );
}
