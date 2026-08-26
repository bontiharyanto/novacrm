import { getSessionProfile } from '@/lib/auth/session';
import { getAccountScope } from '@/lib/accounts/scope';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { QueueCounts } from '@/lib/tickets/queue-counts-types';

export type { QueueCounts } from '@/lib/tickets/queue-counts-types';

const OPEN_STATUSES = ['open', 'in_progress', 'waiting', 'hold'] as const;

const EMPTY: QueueCounts = {
  incident: 0,
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

  const [incident, problem, change, request, all, cab] = await Promise.all([
    countRows(supabase, tenantId, accountId, accountIds, 'incident'),
    countRows(supabase, tenantId, accountId, accountIds, 'problem'),
    countRows(supabase, tenantId, accountId, accountIds, 'change'),
    countRows(supabase, tenantId, accountId, accountIds, 'request'),
    countRows(supabase, tenantId, accountId, accountIds),
    countRows(supabase, tenantId, accountId, accountIds, 'change', ['open']),
  ]);

  return { incident, problem, change, request, all, cab };
}
