import { Badge } from '@/components/ui/badge';
import {
  evaluateTicketSla,
  getEscalationLabel,
  getSlaCountdown,
  getSlaLabel,
  type TicketSlaFields,
} from '@/lib/tickets/sla';

const toneMap = {
  ok: 'success',
  risk: 'warning',
  breached: 'danger',
  paused: 'info',
  none: 'neutral',
} as const;

export function SlaBadge({
  dueDate,
  status,
  slaResponseAt,
  slaResolveBy,
  slaRespondedAt,
  slaPausedAt,
  slaResponseMinutes,
  slaResolveMinutes,
}: TicketSlaFields) {
  const evaluation = evaluateTicketSla({
    dueDate,
    status,
    slaResponseAt,
    slaResolveBy,
    slaRespondedAt,
    slaPausedAt,
    slaResponseMinutes,
    slaResolveMinutes,
  });
  const deadline = slaResolveBy ?? dueDate;
  const overall = evaluation.overall;

  const hints: string[] = [];
  if (evaluation.response === 'breached' && overall !== 'breached') {
    hints.push('Response late');
  } else if (evaluation.response === 'risk' && overall !== 'risk') {
    hints.push('Response risk');
  } else if (overall === 'risk') {
    const escalate = getEscalationLabel(overall);
    if (escalate) hints.push(escalate);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={toneMap[overall]}>{getSlaLabel(overall)}</Badge>
      {overall !== 'none' ? (
        <span className="font-mono text-[10px] text-zinc-500">{getSlaCountdown(deadline, slaPausedAt)}</span>
      ) : null}
      {hints.length > 0 ? (
        <span className="text-[10px] text-zinc-500">{hints.join(' · ')}</span>
      ) : null}
    </span>
  );
}
