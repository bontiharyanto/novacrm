'use server';

import { requireAccountId } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadMajorImpactContext, matchMajorsForAccount } from '@/lib/tickets/major-context';

export type AffectingMajor = {
  id: string;
  number: string;
  title: string;
  status: string;
  cmdbItemId?: string;
  cmdbItemName?: string;
  matchReason: 'ci_overlap' | 'location' | 'child_ticket' | 'site' | 'ip_subnet';
};

export async function listMajorsAffectingUser(
  location?: string,
  accountIdOverride?: string,
): Promise<AffectingMajor[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const scoped = await requireAccountId(session, accountIdOverride);
  if (!scoped.accountId) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;
  const accountId = scoped.accountId;

  const ctx = await loadMajorImpactContext(supabase, tenantId, accountId);

  const { data: userChildren } = await supabase
    .from('tickets')
    .select('parent_ticket_id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('requester_id', session.userId)
    .not('parent_ticket_id', 'is', null)
    .in('status', ['open', 'in_progress', 'waiting', 'hold']);

  const linkedParentIds = new Set(
    (userChildren ?? []).map((row) => row.parent_ticket_id).filter((id): id is string => Boolean(id)),
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('site, client_ip')
    .eq('id', session.userId)
    .maybeSingle();

  return matchMajorsForAccount(ctx, {
    location,
    site: profile?.site ?? undefined,
    clientIp: profile?.client_ip ?? undefined,
    linkedParentIds,
  });
}

export async function suggestMajorParent(input: {
  accountId: string;
  location?: string;
  site?: string;
  clientIp?: string;
}) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const scoped = await requireAccountId(session, input.accountId);
  if (!scoped.accountId) return [];

  const supabase = await createSupabaseServerClient();
  const ctx = await loadMajorImpactContext(supabase, session.profile.tenantId, scoped.accountId);
  return matchMajorsForAccount(ctx, {
    location: input.location,
    site: input.site,
    clientIp: input.clientIp,
  });
}
