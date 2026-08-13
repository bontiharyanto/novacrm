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
  const escalate = getEscalationLabel(evaluation.overall);
  const deadline = slaResolveBy ?? dueDate;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={toneMap[evaluation.overall]}>{getSlaLabel(evaluation.overall)}</Badge>
      {evaluation.overall !== 'none' ? (
        <span className="font-mono text-[10px] text-zinc-500">{getSlaCountdown(deadline, slaPausedAt)}</span>
      ) : null}
      {evaluation.response === 'breached' || evaluation.response === 'risk' ? (
        <Badge tone={evaluation.response === 'breached' ? 'danger' : 'warning'}>
          {evaluation.response === 'breached' ? 'Response late' : 'Response risk'}
        </Badge>
      ) : null}
      {escalate ? <Badge tone={evaluation.overall === 'breached' ? 'danger' : 'warning'}>{escalate}</Badge> : null}
    </span>
  );
}
