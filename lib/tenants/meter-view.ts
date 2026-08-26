import type { TenantQuotaLimits } from '@/lib/tenants/quotas';

export type TenantMeterSnapshot = TenantQuotaLimits & {
  accountsUsed: number;
  agentsUsed: number;
  ticketsUsedThisMonth: number;
};

export type MeterLevel = 'ok' | 'warn' | 'critical';

export function meterLevel(used: number, max: number): MeterLevel {
  if (max <= 0) return 'critical';
  const ratio = used / max;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}

export function meterPercent(used: number, max: number) {
  if (max <= 0) return 100;
  return Math.min(100, Math.round((used / max) * 100));
}

export type MeterDimension = {
  key: 'accounts' | 'agents' | 'tickets';
  used: number;
  max: number;
  level: MeterLevel;
  percent: number;
};

export function meterDimensions(snapshot: TenantMeterSnapshot): MeterDimension[] {
  const rows: Array<{ key: MeterDimension['key']; used: number; max: number }> = [
    { key: 'accounts', used: snapshot.accountsUsed, max: snapshot.maxAccounts },
    { key: 'agents', used: snapshot.agentsUsed, max: snapshot.maxAgents },
    { key: 'tickets', used: snapshot.ticketsUsedThisMonth, max: snapshot.maxTicketsPerMonth },
  ];
  return rows.map((row) => ({
    ...row,
    level: meterLevel(row.used, row.max),
    percent: meterPercent(row.used, row.max),
  }));
}

export function worstMeterLevel(dims: MeterDimension[]): MeterLevel {
  if (dims.some((d) => d.level === 'critical')) return 'critical';
  if (dims.some((d) => d.level === 'warn')) return 'warn';
  return 'ok';
}
