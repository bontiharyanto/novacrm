import { Badge } from '@/components/ui/badge';
import { evaluateTicketSla, getSlaCountdown, getSlaLabel } from '@/lib/tickets/sla';

const toneMap = {
  ok: 'success',
  risk: 'warning',
  breached: 'danger',
  paused: 'info',
  none: 'neutral',
} as const;

export function OlaBadge({
  status,
  olaResolveBy,
  olaResponseAt,
  olaResolveMinutes,
  slaPausedAt,
  ucName,
}: {
  status?: string;
  olaResolveBy?: string;
  olaResponseAt?: string;
  olaResolveMinutes?: number;
  slaPausedAt?: string;
  ucName?: string;
}) {
  if (!olaResolveBy) {
    return <span className="text-xs text-zinc-500">No group OLA</span>;
  }

  const evaluation = evaluateTicketSla({
    status,
    slaResolveBy: olaResolveBy,
    slaResponseAt: olaResponseAt,
    slaPausedAt,
    slaResolveMinutes: olaResolveMinutes,
  });

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={toneMap[evaluation.overall]}>{ucName ? `UC ${getSlaLabel(evaluation.overall)}` : getSlaLabel(evaluation.overall)}</Badge>
      <span className="font-mono text-[10px] text-zinc-500">{getSlaCountdown(olaResolveBy, slaPausedAt)}</span>
    </span>
  );
}
