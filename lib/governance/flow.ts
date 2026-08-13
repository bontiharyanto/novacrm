import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { BreachStatus, DsarStatus } from '@/lib/governance/schema';

export type GovernanceSla = 'ok' | 'risk' | 'breached' | 'none';

const DSAR_DONE = new Set<DsarStatus>(['completed', 'rejected']);
const BREACH_DONE = new Set<BreachStatus>(['notified', 'closed']);

export function getDsarSla(dueDate?: string | null, status?: DsarStatus): GovernanceSla {
  if (!dueDate || (status && DSAR_DONE.has(status))) return 'none';
  const diffMs = new Date(dueDate).getTime() - Date.now();
  if (diffMs <= 0) return 'breached';
  if (diffMs <= 1000 * 60 * 60 * 24 * 7) return 'risk';
  return 'ok';
}

export function getBreachNotifySla(
  discoveredAt?: string | null,
  status?: BreachStatus,
  notifyAuthority?: boolean,
): GovernanceSla {
  if (!discoveredAt || !notifyAuthority || (status && BREACH_DONE.has(status))) return 'none';
  const remaining = new Date(discoveredAt).getTime() + 72 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return 'breached';
  if (remaining <= 12 * 60 * 60 * 1000) return 'risk';
  return 'ok';
}

export function getBreachDeadline(discoveredAt: string) {
  return new Date(new Date(discoveredAt).getTime() + 72 * 60 * 60 * 1000).toISOString();
}

export function slaCountdown(dueDate?: string | null) {
  if (!dueDate) return '—';
  return formatDistanceToNow(new Date(dueDate), { addSuffix: true, locale: localeId });
}

export function slaTone(level: GovernanceSla): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'breached') return 'danger';
  if (level === 'risk') return 'warning';
  if (level === 'ok') return 'success';
  return 'neutral';
}

export function slaLabel(level: GovernanceSla, kind: 'dsar' | 'breach') {
  if (level === 'breached') return kind === 'breach' ? '72h missed' : '30d missed';
  if (level === 'risk') return kind === 'breach' ? '72h risk' : 'Due soon';
  if (level === 'ok') return kind === 'breach' ? 'Within 72h' : 'Within 30d';
  return kind === 'breach' ? 'No notify clock' : 'Closed';
}
