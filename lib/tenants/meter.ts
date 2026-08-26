import { STAFF_ROLES } from '@/lib/rbac/roles';
import { quotasForPlan, type TenantQuotaLimits } from '@/lib/tenants/quotas';
import type { TenantPlan } from '@/lib/tenants/lifecycle';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';

export type TenantMeterSnapshot = TenantQuotaLimits & {
  accountsUsed: number;
  agentsUsed: number;
  ticketsUsedThisMonth: number;
};

const TZ_OFFSET: Record<string, string> = {
  'Asia/Jakarta': '+07:00',
  'Asia/Makassar': '+08:00',
  'Asia/Jayapura': '+09:00',
  'Asia/Singapore': '+08:00',
  UTC: '+00:00',
};

/** Start of calendar month in tenant timezone (fixed-offset zones used by NovaCRM). */
export function monthStartIso(timezone: string, now = new Date()) {
  const tz = timezone || 'Asia/Jakarta';
  const cal = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m] = cal.split('-');
  const offset = TZ_OFFSET[tz] ?? '+07:00';
  return `${y}-${m}-01T00:00:00${offset}`;
}

async function tenantClient() {
  if (hasServiceRole()) return createSupabaseAdminClient();
  return createSupabaseServerClient();
}

async function loadQuotaRow(tenantId: string) {
  const client = await tenantClient();
  const { data } = await client
    .from('tenants')
    .select('subscription_plan, timezone, max_accounts, max_agents, max_tickets_per_month')
    .eq('id', tenantId)
    .maybeSingle();
  if (!data) return null;
  const plan = (['trial', 'standard', 'enterprise'] as const).includes(data.subscription_plan as TenantPlan)
    ? (data.subscription_plan as TenantPlan)
    : 'standard';
  const defaults = quotasForPlan(plan);
  return {
    plan,
    timezone: (data.timezone as string) || 'Asia/Jakarta',
    maxAccounts: Number(data.max_accounts ?? defaults.maxAccounts),
    maxAgents: Number(data.max_agents ?? defaults.maxAgents),
    maxTicketsPerMonth: Number(data.max_tickets_per_month ?? defaults.maxTicketsPerMonth),
  };
}

export async function countTenantAccounts(tenantId: string) {
  const client = await tenantClient();
  const { count } = await client
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'archived');
  return count ?? 0;
}

export async function countTenantAgents(tenantId: string) {
  const client = await tenantClient();
  const { count } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('role', [...STAFF_ROLES]);
  return count ?? 0;
}

export async function countTenantTicketsThisMonth(tenantId: string, timezone: string) {
  const client = await tenantClient();
  const start = monthStartIso(timezone);
  const { count } = await client
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', start);
  return count ?? 0;
}

export async function getTenantMeterSnapshot(tenantId: string): Promise<TenantMeterSnapshot | null> {
  const row = await loadQuotaRow(tenantId);
  if (!row) return null;
  const [accountsUsed, agentsUsed, ticketsUsedThisMonth] = await Promise.all([
    countTenantAccounts(tenantId),
    countTenantAgents(tenantId),
    countTenantTicketsThisMonth(tenantId, row.timezone),
  ]);
  return {
    maxAccounts: row.maxAccounts,
    maxAgents: row.maxAgents,
    maxTicketsPerMonth: row.maxTicketsPerMonth,
    accountsUsed,
    agentsUsed,
    ticketsUsedThisMonth,
  };
}

/** Returns error message when creating one more account would exceed the cap. */
export async function assertAccountQuota(tenantId: string): Promise<string | null> {
  const row = await loadQuotaRow(tenantId);
  if (!row) return 'Tenant not found';
  const used = await countTenantAccounts(tenantId);
  if (used >= row.maxAccounts) {
    return `Account limit reached (${used}/${row.maxAccounts}). Ask the platform admin to raise the quota on /tenants.`;
  }
  return null;
}

/**
 * When adding a desk agent seat (new staff user, or promoting customer → staff).
 * `additional` = how many new staff seats this action would consume (usually 1).
 * Skip when creating a portal customer.
 */
export async function assertAgentQuota(tenantId: string, additional = 1): Promise<string | null> {
  if (additional <= 0) return null;
  const row = await loadQuotaRow(tenantId);
  if (!row) return 'Tenant not found';
  const used = await countTenantAgents(tenantId);
  if (used + additional > row.maxAgents) {
    return `Agent limit reached (${used}/${row.maxAgents}). Ask the platform admin to raise the quota on /tenants.`;
  }
  return null;
}

/** Returns error message when creating `additional` tickets would exceed the monthly cap. */
export async function assertTicketQuota(tenantId: string, additional = 1): Promise<string | null> {
  if (additional <= 0) return null;
  const row = await loadQuotaRow(tenantId);
  if (!row) return 'Tenant not found';
  const used = await countTenantTicketsThisMonth(tenantId, row.timezone);
  if (used + additional > row.maxTicketsPerMonth) {
    return `Monthly ticket limit reached (${used}/${row.maxTicketsPerMonth}). Ask the platform admin to raise the quota on /tenants.`;
  }
  return null;
}

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
