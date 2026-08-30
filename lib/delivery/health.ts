import type { DeliveryPhaseStatus } from '@/lib/delivery/schema';

export type DeliveryPhaseHealth = 'healthy' | 'at_risk' | 'blocked';
export type DeliveryPhaseHealthReason = 'on_track' | 'overdue' | 'due_soon' | 'blocked';

export function derivePhaseHealth(
  phase: { status: DeliveryPhaseStatus; plannedEnd?: string | null },
  today = new Date().toISOString().slice(0, 10),
): { health: DeliveryPhaseHealth; reason: DeliveryPhaseHealthReason } {
  if (phase.status === 'blocked') return { health: 'blocked', reason: 'blocked' };
  if (phase.status === 'completed' || phase.status === 'cancelled') {
    return { health: 'healthy', reason: 'on_track' };
  }
  if (phase.plannedEnd && phase.plannedEnd < today) return { health: 'at_risk', reason: 'overdue' };

  const dueSoon = phase.plannedEnd && phase.plannedEnd <= addDays(today, 3);
  if (dueSoon) return { health: 'at_risk', reason: 'due_soon' };
  return { health: 'healthy', reason: 'on_track' };
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
