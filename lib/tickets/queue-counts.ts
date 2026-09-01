import { getSessionProfile } from '@/lib/auth/session';
import { getAccountScope } from '@/lib/accounts/scope';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { evaluateTicketSla } from '@/lib/tickets/sla';
import type { QueueCounts } from '@/lib/tickets/queue-counts-types';

export type { QueueCounts } from '@/lib/tickets/queue-counts-types';

const OPEN_STATUSES = ['open', 'in_progress', 'waiting', 'hold'] as const;

const SLA_RISK_SELECT =
  'status, due_date, sla_resolve_by, sla_response_at, sla_responded_at, sla_paused_at, sla_response_minutes, sla_resolve_minutes';

const EMPTY: QueueCounts = {
  incident: 0,
  incidentSlaRisk: 0,
  problem: 0,
  change: 0,
  request: 0,
  all: 0,
  cab: 0,
};

function applyAccountFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  accountId: string | null,
  accountIds: string[] | null,
) {
  if (accountId) return query.eq('account_id', accountId);
  if (accountIds && accountIds.length > 0) return query.in('account_id', accountIds);
  return query;
}

async function countRows(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string | null,
  accountIds: string[] | null,
  type?: string,
  statuses: readonly string[] = OPEN_STATUSES,
) {
  let query = supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', [...statuses]);
  if (type) query = query.eq('type', type);
  query = applyAccountFilter(query, accountId, accountIds);
  const { count } = await query;
  return count ?? 0;
}

async function countIncidentSlaRisk(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string | null,
  accountIds: string[] | null,
) {
  let query = supabase
    .from('tickets')
    .select(SLA_RISK_SELECT)
    .eq('tenant_id', tenantId)
    .eq('type', 'incident')
    .in('status', [...OPEN_STATUSES]);
  query = applyAccountFilter(query, accountId, accountIds);
  const { data } = await query;
  if (!data?.length) return 0;

  return data.filter((row) => {
    const level = evaluateTicketSla({
      status: row.status,
      dueDate: row.due_date,
      slaResolveBy: row.sla_resolve_by,
      slaResponseAt: row.sla_response_at,
      slaRespondedAt: row.sla_responded_at,
      slaPausedAt: row.sla_paused_at,
      slaResponseMinutes: row.sla_response_minutes,
      slaResolveMinutes: row.sla_resolve_minutes,
    }).overall;
    return level === 'risk' || level === 'breached';
  }).length;
}

export async function getQueueCounts(): Promise<QueueCounts> {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) return EMPTY;

  const scope = await getAccountScope(session);
  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;
  const accountId = scope.account?.id ?? null;
  const accountIds =
    !scope.account && !scope.viewingAll && scope.accounts.length > 0
      ? scope.accounts.map((item) => item.id)
      : null;

  const [incident, incidentSlaRisk, problem, change, request, all, cab] = await Promise.all([
    countRows(supabase, tenantId, accountId, accountIds, 'incident'),
    countIncidentSlaRisk(supabase, tenantId, accountId, accountIds),
    countRows(supabase, tenantId, accountId, accountIds, 'problem'),
    countRows(supabase, tenantId, accountId, accountIds, 'change'),
    countRows(supabase, tenantId, accountId, accountIds, 'request'),
    countRows(supabase, tenantId, accountId, accountIds),
    countRows(supabase, tenantId, accountId, accountIds, 'change', ['open']),
  ]);

  return { incident, incidentSlaRisk, problem, change, request, all, cab };
}
