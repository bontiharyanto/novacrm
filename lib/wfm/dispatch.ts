import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { listEligibleAgentsForGroup, loadDispatchPolicy, pickDispatcher } from '@/lib/wfm/eligible';

type TicketRow = {
  id: string;
  group_id?: string | null;
  assignee_id?: string | null;
  account_id?: string | null;
  category?: string | null;
};

async function currentOncallUserIds(client: SupabaseClient, tenantId: string, groupId: string, at: Date) {
  const { data: rotations } = await client
    .from('wfm_oncall_rotations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .eq('is_active', true);
  const rotationIds = (rotations ?? []).map((row) => row.id as string);
  if (rotationIds.length === 0) return [];
  const { data: slots } = await client
    .from('wfm_oncall_slots')
    .select('primary_user_id, backup_user_id, starts_at, ends_at')
    .eq('tenant_id', tenantId)
    .in('rotation_id', rotationIds)
    .lte('starts_at', at.toISOString())
    .gte('ends_at', at.toISOString());
  const ids: string[] = [];
  for (const slot of slots ?? []) {
    if (slot.primary_user_id) ids.push(slot.primary_user_id);
    if (slot.backup_user_id) ids.push(slot.backup_user_id);
  }
  return ids;
}

export async function resolveAccountL1GroupId(
  client: SupabaseClient,
  tenantId: string,
  accountId?: string | null,
) {
  if (accountId) {
    const { data: accountGroup } = await client
      .from('assignment_groups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('account_id', accountId)
      .eq('kind', 'assignment')
      .eq('is_active', true)
      .eq('tier', 'l1')
      .order('name')
      .limit(1)
      .maybeSingle();
    if (accountGroup?.id) return accountGroup.id;
  }
  return resolveInboundGroupId(client, tenantId);
}

export async function resolveSameAccountL1GroupId(
  client: SupabaseClient,
  tenantId: string,
  accountId?: string | null,
) {
  if (!accountId) return null;
  const { data } = await client
    .from('assignment_groups')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('kind', 'assignment')
    .eq('is_active', true)
    .eq('tier', 'l1')
    .order('name')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function resolveInboundGroupId(client: SupabaseClient, tenantId: string) {
  const { data: account } = await client
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'internal')
    .maybeSingle();
  if (!account) return null;
  const { data: group } = await client
    .from('assignment_groups')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', account.id)
    .eq('kind', 'assignment')
    .eq('is_active', true)
    .eq('tier', 'l1')
    .order('name')
    .limit(1)
    .maybeSingle();
  return group?.id ?? null;
}

export async function dispatchTicket(
  tenantId: string,
  ticketId: string,
  options?: { client?: SupabaseClient; force?: boolean },
): Promise<{ ok: boolean; assigneeId?: string; assigneeName?: string; skipped?: boolean; error?: string }> {
  const client = hasServiceRole() ? createSupabaseAdminClient() : options?.client ?? null;
  if (!client) return { ok: false, error: 'Dispatcher requires a database client' };

  const { data: ticket } = await client
    .from('tickets')
    .select('id, group_id, assignee_id, account_id, category')
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!ticket) return { ok: false, error: 'Ticket not found' };

  const row = ticket as TicketRow;
  if (row.assignee_id && !options?.force) {
    return { ok: true, skipped: true, assigneeId: row.assignee_id };
  }
  if (!row.group_id) {
    const fallbackGroupId = await resolveAccountL1GroupId(client, tenantId, row.account_id);
    if (!fallbackGroupId) return { ok: true, skipped: true };
    await client
      .from('tickets')
      .update({ group_id: fallbackGroupId })
      .eq('id', ticketId)
      .eq('tenant_id', tenantId);
    row.group_id = fallbackGroupId;
  }

  const groupId = row.group_id;
  if (!groupId) return { ok: true, skipped: true };

  const policy = await loadDispatchPolicy(client, tenantId, groupId);
  if (policy && !policy.isActive) return { ok: true, skipped: true };
  if ((policy?.strategy ?? 'least_loaded') === 'manual' && !options?.force) {
    return { ok: true, skipped: true };
  }

  const at = new Date();
  let agents = await listEligibleAgentsForGroup(client, tenantId, groupId, at);
  let oncallIds: string[] = [];
  if (policy?.strategy === 'oncall') {
    oncallIds = await currentOncallUserIds(client, tenantId, groupId, at);
  } else if (policy?.oncallGroupId && agents.every((agent) => !agent.eligible)) {
    agents = await listEligibleAgentsForGroup(client, tenantId, policy.oncallGroupId, at);
    oncallIds = await currentOncallUserIds(client, tenantId, policy.oncallGroupId, at);
  }

  const picked = pickDispatcher(agents, policy, oncallIds);
  if (!picked) return { ok: true, skipped: true, error: 'No eligible agent' };

  const { data: profile } = await client
    .from('profiles')
    .select('id, full_name, telegram_chat_id')
    .eq('id', picked.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!profile) return { ok: false, error: 'Assignee profile missing' };

  const { error } = await client
    .from('tickets')
    .update({
      assignee_id: profile.id,
      assignee_name: profile.full_name,
      assignee_chat_id: profile.telegram_chat_id,
    })
    .eq('id', ticketId)
    .eq('tenant_id', tenantId);
  if (error) return { ok: false, error: error.message };

  if (policy) {
    await client
      .from('wfm_dispatch_policies')
      .update({ last_assignee_id: profile.id })
      .eq('id', policy.id)
      .eq('tenant_id', tenantId);
  }

  return { ok: true, assigneeId: profile.id, assigneeName: profile.full_name };
}
