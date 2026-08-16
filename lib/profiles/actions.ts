'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionProfile } from '@/lib/auth/session';
import { requireAccountId } from '@/lib/accounts/scope';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isCustomerRole, isStaffRole, STAFF_ROLES } from '@/lib/rbac/roles';
import { listEligibleAgentsForGroup } from '@/lib/wfm/eligible';
import { isOpenTicketStatus } from '@/lib/wfm/time';
import type { WfmEligibleAgent } from '@/lib/wfm/schema';

export type AssignableAgent = WfmEligibleAgent;

async function listStaffForAccount(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string,
): Promise<AssignableAgent[]> {
  const [{ data: accountMembers }, { data: groups }] = await Promise.all([
    supabase
      .from('account_members')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .eq('account_id', accountId)
      .neq('role', 'portal'),
    supabase.from('assignment_groups').select('id').eq('tenant_id', tenantId).eq('account_id', accountId),
  ]);

  const groupIds = (groups ?? []).map((row) => row.id);
  const { data: groupMembers } =
    groupIds.length > 0
      ? await supabase
          .from('assignment_group_members')
          .select('user_id')
          .eq('tenant_id', tenantId)
          .in('group_id', groupIds)
      : { data: [] };

  const userIds = Array.from(
    new Set([
      ...(accountMembers ?? []).map((row) => row.user_id),
      ...(groupMembers ?? []).map((row) => row.user_id),
    ]),
  );
  if (userIds.length === 0) return [];

  const [{ data: profiles }, { data: tickets }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('tenant_id', tenantId)
      .in('id', userIds)
      .in('role', [...STAFF_ROLES]),
    supabase
      .from('tickets')
      .select('assignee_id, status')
      .eq('tenant_id', tenantId)
      .eq('account_id', accountId)
      .in('assignee_id', userIds),
  ]);

  const openByAssignee = new Map<string, number>();
  for (const row of tickets ?? []) {
    if (!row.assignee_id || !isOpenTicketStatus(row.status)) continue;
    openByAssignee.set(row.assignee_id, (openByAssignee.get(row.assignee_id) ?? 0) + 1);
  }

  return (profiles ?? [])
    .filter((row) => isStaffRole(row.role))
    .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email ?? undefined,
      role: row.role as AssignableAgent['role'],
      eligible: true,
      reasons: [],
      openTickets: openByAssignee.get(row.id) ?? 0,
      maxOpen: 8,
      presence: 'available' as const,
      onShift: true,
      skillIds: [],
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

async function mergeAccountStaff(
  supabase: SupabaseClient,
  tenantId: string,
  accountIds: string[],
): Promise<AssignableAgent[]> {
  const merged = new Map<string, AssignableAgent>();
  for (const accountId of accountIds) {
    const staff = await listStaffForAccount(supabase, tenantId, accountId);
    for (const agent of staff) {
      const current = merged.get(agent.id);
      if (!current) {
        merged.set(agent.id, agent);
      } else {
        merged.set(agent.id, { ...current, openTickets: current.openTickets + agent.openTickets });
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function listAssignableAgents(groupId?: string, accountId?: string): Promise<AssignableAgent[]> {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;
  const scoped = await requireAccountId(session, accountId);
  const targetAccountId = scoped.accountId;

  if (targetAccountId) {
    const accountStaff = await listStaffForAccount(supabase, tenantId, targetAccountId);
    if (!groupId) return accountStaff;

    const { data: group } = await supabase
      .from('assignment_groups')
      .select('id, account_id')
      .eq('id', groupId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!group || group.account_id !== targetAccountId) {
      return accountStaff;
    }

    const groupAgents = await listEligibleAgentsForGroup(supabase, tenantId, groupId);
    const allowed = new Set(accountStaff.map((agent) => agent.id));
    return groupAgents.filter((agent) => allowed.has(agent.id));
  }

  if (groupId) {
    const { data: group } = await supabase
      .from('assignment_groups')
      .select('account_id')
      .eq('id', groupId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (group?.account_id) {
      return listAssignableAgents(groupId, group.account_id);
    }
  }

  return mergeAccountStaff(
    supabase,
    tenantId,
    scoped.scope.accounts.map((account) => account.id),
  );
}
