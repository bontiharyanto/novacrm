import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export type SlaLevel = 'ok' | 'risk' | 'breached' | 'paused' | 'none';

export type TicketSlaFields = {
  dueDate?: string | null;
  status?: string;
  slaResponseAt?: string | null;
  slaResolveBy?: string | null;
  slaRespondedAt?: string | null;
  slaPausedAt?: string | null;
  slaResponseMinutes?: number | null;
  slaResolveMinutes?: number | null;
};

const RISK_REMAINING_MS = 60 * 60 * 1000;
const RISK_RATIO = 0.25;

function remainingMs(deadline: string, now: Date, pausedAt?: string | null) {
  const reference = pausedAt ? new Date(pausedAt) : now;
  return new Date(deadline).getTime() - reference.getTime();
}

function levelForDeadline(
  deadline: string | null | undefined,
  totalMinutes: number | null | undefined,
  status: string | undefined,
  pausedAt: string | null | undefined,
  now: Date,
): SlaLevel {
  if (!deadline || status === 'resolved' || status === 'closed') return 'none';
  if (pausedAt) return 'paused';
  const remaining = remainingMs(deadline, now, pausedAt);
  if (remaining <= 0) return 'breached';
  const totalMs = (totalMinutes ?? 0) * 60_000;
  if (remaining <= RISK_REMAINING_MS || (totalMs > 0 && remaining / totalMs <= RISK_RATIO)) {
    return 'risk';
  }
  return 'ok';
}

export function getSlaLevel(dueDate?: string | null, status?: string, extras?: TicketSlaFields): SlaLevel {
  const pausedAt = extras?.slaPausedAt;
  const resolveBy = extras?.slaResolveBy ?? dueDate;
  return levelForDeadline(resolveBy, extras?.slaResolveMinutes, status, pausedAt, new Date());
}

export function evaluateTicketSla(ticket: TicketSlaFields, now = new Date()) {
  const resolveBy = ticket.slaResolveBy ?? ticket.dueDate;
  const resolve = levelForDeadline(
    resolveBy,
    ticket.slaResolveMinutes,
    ticket.status,
    ticket.slaPausedAt,
    now,
  );
  const response =
    ticket.slaRespondedAt || !ticket.slaResponseAt
      ? ('none' as SlaLevel)
      : levelForDeadline(ticket.slaResponseAt, ticket.slaResponseMinutes, ticket.status, ticket.slaPausedAt, now);

  const rank: Record<SlaLevel, number> = { none: 0, ok: 1, paused: 2, risk: 3, breached: 4 };
  const overall =
    resolve === 'paused' || response === 'paused'
      ? ('paused' as SlaLevel)
      : rank[response] >= rank[resolve]
        ? response
        : resolve;

  return { resolve, response, overall };
}

export function getSlaLabel(level: SlaLevel) {
  if (level === 'breached') return 'SLA breached';
  if (level === 'risk') return 'SLA at risk';
  if (level === 'paused') return 'SLA paused';
  if (level === 'ok') return 'Within SLA';
  return 'No SLA';
}

export function getSlaCountdown(dueDate?: string | null, pausedAt?: string | null) {
  if (!dueDate) return '—';
  const reference = pausedAt ? new Date(pausedAt) : new Date();
  const target = new Date(dueDate);
  if (pausedAt) {
    const remaining = target.getTime() - reference.getTime();
    const shifted = new Date(Date.now() + remaining);
    return formatDistanceToNow(shifted, { addSuffix: true, locale: id });
  }
  return formatDistanceToNow(target, { addSuffix: true, locale: id });
}

export function getEscalationLabel(level: SlaLevel) {
  if (level === 'breached') return 'Escalate';
  if (level === 'risk') return 'Watch';
  return null;
}
