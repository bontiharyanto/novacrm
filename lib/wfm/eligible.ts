import type { SupabaseClient } from '@supabase/supabase-js';
import type { WfmDispatchPolicy, WfmEligibleAgent, WfmEligibleReason, WfmPresenceStatus } from '@/lib/wfm/schema';
import { addDaysYmd, isOpenTicketStatus, isWithinShift, zonedYmd } from '@/lib/wfm/time';
import { isStaffRole } from '@/lib/rbac/roles';

type MemberRow = { user_id: string; role: string };
type ProfileRow = { id: string; full_name: string; email?: string | null; role: string };
type PresenceRow = { user_id: string; status: WfmPresenceStatus; until?: string | null };
type RosterRow = {
  user_id: string;
  group_id: string;
  work_date: string;
  template_id: string;
  wfm_shift_templates?: { start_local: string; end_local: string; timezone: string } | { start_local: string; end_local: string; timezone: string }[] | null;
};
type TimeOffRow = { user_id: string; starts_at: string; ends_at: string };
type SkillRow = { user_id: string; skill_id: string };
type TicketCountRow = { assignee_id: string | null; status: string; group_id?: string | null };

function templateOf(row: RosterRow) {
  const nested = row.wfm_shift_templates;
  return Array.isArray(nested) ? nested[0] : nested;
}

export async function loadDispatchPolicy(
  client: SupabaseClient,
  tenantId: string,
  groupId: string,
): Promise<WfmDispatchPolicy | null> {
  const { data } = await client
    .from('wfm_dispatch_policies')
    .select('id, group_id, strategy, max_open_tickets, required_skill_ids, oncall_group_id, last_assignee_id, is_active')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    groupId: data.group_id,
    strategy: data.strategy,
    maxOpenTickets: data.max_open_tickets,
    requiredSkillIds: data.required_skill_ids ?? [],
    oncallGroupId: data.oncall_group_id ?? undefined,
    lastAssigneeId: data.last_assignee_id ?? undefined,
    isActive: data.is_active,
  };
}

export async function listEligibleAgentsForGroup(
  client: SupabaseClient,
  tenantId: string,
  groupId: string,
  at = new Date(),
): Promise<WfmEligibleAgent[]> {
  const [{ data: members }, policy] = await Promise.all([
    client.from('assignment_group_members').select('user_id, role').eq('tenant_id', tenantId).eq('group_id', groupId),
    loadDispatchPolicy(client, tenantId, groupId),
  ]);
  const memberIds = ((members ?? []) as MemberRow[]).map((row) => row.user_id);
  if (memberIds.length === 0) return [];

  const maxOpen = policy?.maxOpenTickets ?? 8;
  const requiredSkills = policy?.requiredSkillIds ?? [];
  const today = zonedYmd(at, 'Asia/Jakarta');
  const yesterday = addDaysYmd(today, -1);

  const [{ data: profiles }, { data: presence }, { data: roster }, { data: timeOff }, { data: skills }, { data: tickets }] =
    await Promise.all([
      client.from('profiles').select('id, full_name, email, role').eq('tenant_id', tenantId).in('id', memberIds),
      client.from('wfm_presence').select('user_id, status, until').eq('tenant_id', tenantId).in('user_id', memberIds),
      client
        .from('wfm_roster_entries')
        .select('user_id, group_id, work_date, template_id, wfm_shift_templates(start_local, end_local, timezone)')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .in('work_date', [yesterday, today]),
      client
        .from('wfm_time_off')
        .select('user_id, starts_at, ends_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .in('user_id', memberIds)
        .lte('starts_at', at.toISOString())
        .gte('ends_at', at.toISOString()),
      client.from('wfm_agent_skills').select('user_id, skill_id').eq('tenant_id', tenantId).in('user_id', memberIds),
      client
        .from('tickets')
        .select('assignee_id, status')
        .eq('tenant_id', tenantId)
        .in('assignee_id', memberIds),
    ]);

  const presenceMap = new Map(((presence ?? []) as PresenceRow[]).map((row) => [row.user_id, row]));
  const offSet = new Set(((timeOff ?? []) as TimeOffRow[]).map((row) => row.user_id));
  const skillMap = new Map<string, string[]>();
  for (const row of (skills ?? []) as SkillRow[]) {
    const list = skillMap.get(row.user_id) ?? [];
    list.push(row.skill_id);
    skillMap.set(row.user_id, list);
  }
  const openMap = new Map<string, number>();
  for (const row of (tickets ?? []) as TicketCountRow[]) {
    if (!row.assignee_id || !isOpenTicketStatus(row.status)) continue;
    openMap.set(row.assignee_id, (openMap.get(row.assignee_id) ?? 0) + 1);
  }

  const rosterRows = (roster ?? []) as RosterRow[];
  const hasRoster = rosterRows.length > 0;
  const onShift = new Set<string>();
  for (const row of rosterRows) {
    const template = templateOf(row);
    if (!template) continue;
    if (isWithinShift(at, row.work_date, template.start_local, template.end_local, template.timezone)) {
      onShift.add(row.user_id);
    }
  }

  return ((profiles ?? []) as ProfileRow[])
    .filter((row) => isStaffRole(row.role))
    .map((row) => {
      const reasons: WfmEligibleReason[] = [];
      const presenceStatus = presenceMap.get(row.id)?.status ?? 'offline';
      const shiftOk = !hasRoster || onShift.has(row.id);
      if (!shiftOk) reasons.push('off_shift');
      if (offSet.has(row.id)) reasons.push('on_leave');
      if (presenceStatus === 'offline' || presenceStatus === 'break') reasons.push('offline');
      if (presenceStatus === 'busy') reasons.push('busy');
      const openTickets = openMap.get(row.id) ?? 0;
      if (openTickets >= maxOpen) reasons.push('at_cap');
      const skillIds = skillMap.get(row.id) ?? [];
      if (requiredSkills.length > 0 && !requiredSkills.every((id) => skillIds.includes(id))) {
        reasons.push('missing_skill');
      }
      return {
        id: row.id,
        fullName: row.full_name,
        email: row.email ?? undefined,
        role: row.role as WfmEligibleAgent['role'],
        groupId,
        eligible: reasons.length === 0,
        reasons,
        openTickets,
        maxOpen,
        presence: presenceStatus,
        onShift: shiftOk,
        skillIds,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function pickDispatcher(
  agents: WfmEligibleAgent[],
  policy: WfmDispatchPolicy | null,
  oncallUserIds: string[] = [],
): WfmEligibleAgent | null {
  const strategy = policy?.strategy ?? 'least_loaded';
  if (strategy === 'manual') return null;

  const without = (ignore: WfmEligibleReason[]) =>
    agents.filter((agent) => agent.reasons.every((reason) => ignore.includes(reason)));

  let pool = agents.filter((agent) => agent.eligible);
  if (strategy === 'skill' && pool.length === 0) {
    pool = without(['missing_skill']);
  }
  if (strategy === 'oncall') {
    for (const userId of oncallUserIds) {
      const hit = agents.find(
        (agent) =>
          agent.id === userId &&
          !agent.reasons.includes('on_leave') &&
          agent.presence === 'available',
      );
      if (hit) return hit;
    }
    pool = agents.filter((agent) => !agent.reasons.includes('on_leave') && agent.presence === 'available');
  }

  if (pool.length === 0) return null;
  if (strategy === 'round_robin') {
    const last = policy?.lastAssigneeId;
    if (!last) return pool[0];
    const index = pool.findIndex((agent) => agent.id === last);
    return pool[(index + 1) % pool.length] ?? pool[0];
  }
  return [...pool].sort((a, b) => a.openTickets - b.openTickets || a.fullName.localeCompare(b.fullName))[0] ?? null;
}
