import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAccountId } from '@/lib/accounts/scope';
import { getReportSnapshot } from '@/lib/reports/actions';
import { listWfmOccupancy, getWfmForecast } from '@/lib/wfm/actions';
import { getSlaLevel } from '@/lib/tickets/sla';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { getPreferences } from '@/lib/preferences/server';
import type { InsightSignals } from '@/lib/insights/schema';

const OPEN = new Set(['open', 'in_progress', 'waiting', 'hold']);

export async function gatherInsightSignals(): Promise<InsightSignals | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) return null;

  const scoped = await requireAccountId(session);
  const locale = getPreferences().locale;
  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  const [report, occupancy, forecast, ai, ticketRows, accountRows] = await Promise.all([
    getReportSnapshot({ range: '7' }),
    listWfmOccupancy(),
    getWfmForecast(),
    getAiConfigForTenant(tenantId),
    (async () => {
      let query = supabase
        .from('tickets')
        .select('account_id, status, assignee_id, sla_resolve_by, due_date, sla_paused_at, sla_resolve_minutes')
        .eq('tenant_id', tenantId);
      if (scoped.accountId) query = query.eq('account_id', scoped.accountId);
      const { data } = await query;
      return data ?? [];
    })(),
    supabase
      .from('accounts')
      .select('id, code, name, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ]);

  const kpis = report?.kpis ?? {
    open: 0,
    unassigned: 0,
    slaBreached: 0,
    slaRisk: 0,
    cabReview: 0,
    emergencyChanges: 0,
    warrantySoon: 0,
    catalogPublished: 0,
    frtMinutes: 0,
    mttrMinutes: 0,
    backlogAging: 0,
    ucBreached: 0,
    csatAverage: 0,
    csatCount: 0,
  };

  const groups = occupancy.map((row) => {
    const overCap = row.agents.filter((agent) => agent.openTickets >= agent.maxOpen).length;
    const underUtilised = row.agents.filter(
      (agent) => agent.eligible && agent.openTickets * 2 < agent.maxOpen,
    ).length;
    return {
      groupName: row.groupName,
      unassigned: row.unassigned,
      onShift: row.onShift,
      available: row.available,
      overCap,
      underUtilised,
    };
  });

  const accountMap = new Map(
    (accountRows.data ?? []).map((row) => [
      row.id as string,
      { code: (row.code as string | null) || (row.name as string) || 'account' },
    ]),
  );

  const health = new Map<string, { code: string; open: number; unassigned: number; slaBreached: number; slaRisk: number }>();
  for (const ticket of ticketRows) {
    const accountId = (ticket.account_id as string | null) ?? '_none';
    const code = accountMap.get(accountId)?.code ?? (accountId === '_none' ? 'unscoped' : accountId.slice(0, 8));
    const current = health.get(accountId) ?? { code, open: 0, unassigned: 0, slaBreached: 0, slaRisk: 0 };
    const status = String(ticket.status);
    if (OPEN.has(status)) {
      current.open += 1;
      if (!ticket.assignee_id) current.unassigned += 1;
    }
    const sla = getSlaLevel(ticket.sla_resolve_by ?? ticket.due_date, status, {
      slaResolveBy: ticket.sla_resolve_by ?? ticket.due_date,
      slaPausedAt: ticket.sla_paused_at,
      slaResolveMinutes: ticket.sla_resolve_minutes,
    });
    if (sla === 'breached') current.slaBreached += 1;
    if (sla === 'risk') current.slaRisk += 1;
    health.set(accountId, current);
  }

  const accounts = Array.from(health.values())
    .sort((a, b) => b.slaBreached - a.slaBreached || b.slaRisk - a.slaRisk || b.open - a.open)
    .slice(0, 8);

  return {
    locale,
    role: session.profile.role,
    viewingAll: !scoped.accountId,
    accountCode: scoped.scope.account?.code ?? scoped.scope.account?.name ?? null,
    aiConfigured: Boolean(ai),
    queue: {
      open: kpis.open,
      unassigned: kpis.unassigned,
      aging: (report?.aging ?? []).slice(0, 6).map((row) => ({
        number: row.number,
        ageDays: row.ageDays,
        status: row.status,
      })),
      byPriority: (report?.byPriority ?? []).map((row) => ({ label: row.label, value: row.value })),
    },
    sla: {
      slaBreached: kpis.slaBreached,
      slaRisk: kpis.slaRisk,
      cabReview: kpis.cabReview,
      emergencyChanges: kpis.emergencyChanges,
      agingDue: (report?.aging ?? [])
        .filter((row) => row.dueDate)
        .slice(0, 6)
        .map((row) => ({ number: row.number, ageDays: row.ageDays, dueDate: row.dueDate })),
    },
    workforce: {
      groups: groups.slice(0, 8),
      overCap: groups.reduce((sum, row) => sum + row.overCap, 0),
      underUtilised: groups.reduce((sum, row) => sum + row.underUtilised, 0),
      forecast: forecast.buckets.map((row) => ({
        label: row.label,
        tickets: row.tickets,
        headcount: row.headcount,
        gap: row.gap,
      })),
    },
    accounts: { accounts },
  };
}
