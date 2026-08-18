'use server';

import { revalidatePath } from 'next/cache';
import {
  agentSkillSchema,
  dispatchPolicySchema,
  oncallRotationSchema,
  oncallSlotSchema,
  presenceSchema,
  rosterEntrySchema,
  skillSchema,
  shiftTemplateSchema,
  timeOffSchema,
  timeOffStatusSchema,
  type WfmAdherenceRow,
  type WfmAgentSkill,
  type WfmDispatchPolicy,
  type WfmEligibleAgent,
  type WfmForecastBucket,
  type WfmOccupancyRow,
  type WfmOncallRotation,
  type WfmPresence,
  type WfmPresenceStatus,
  type WfmRosterEntry,
  type WfmShiftTemplate,
  type WfmSkill,
  type WfmTimeOff,
} from '@/lib/wfm/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { requireAccountId } from '@/lib/accounts/scope';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listEligibleAgentsForGroup, loadDispatchPolicy } from '@/lib/wfm/eligible';
import { dispatchTicket } from '@/lib/wfm/dispatch';
import { computeAdherence, computeForecast } from '@/lib/wfm/forecast';
import { isOpenTicketStatus } from '@/lib/wfm/time';
import { formatZodError } from '@/lib/validation/zod-error';
import { parseImportFile } from '@/lib/import/parse';
import { isStaffRole } from '@/lib/rbac/roles';
import {
  ROSTER_IMPORT_MAX,
  keyName,
  mapRosterImportRows,
  parseWorkDate,
} from '@/lib/wfm/roster-import';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'skill';
}

function revalidateWfm() {
  revalidatePath('/wfm');
  revalidatePath('/wfm/roster');
  revalidatePath('/wfm/skills');
  revalidatePath('/wfm/oncall');
  revalidatePath('/wfm/forecast');
}

export async function listWfmOccupancy(): Promise<WfmOccupancyRow[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  let groupQuery = supabase
    .from('assignment_groups')
    .select('id, name, kind, tier')
    .eq('tenant_id', session.profile.tenantId)
    .eq('is_active', true)
    .order('name');
  if (scoped.accountId) {
    groupQuery = groupQuery.eq('account_id', scoped.accountId);
  }
  const { data: groups } = await groupQuery;
  if (!groups) return [];

  let ticketQuery = supabase.from('tickets').select('group_id, assignee_id, status').eq('tenant_id', session.profile.tenantId);
  if (scoped.accountId) {
    ticketQuery = ticketQuery.eq('account_id', scoped.accountId);
  }
  const { data: tickets } = await ticketQuery;

  const rows: WfmOccupancyRow[] = [];
  for (const group of groups) {
    const agents = await listEligibleAgentsForGroup(supabase, session.profile.tenantId, group.id);
    const policy = await loadDispatchPolicy(supabase, session.profile.tenantId, group.id);
    const unassigned = (tickets ?? []).filter(
      (ticket) => ticket.group_id === group.id && !ticket.assignee_id && isOpenTicketStatus(ticket.status),
    ).length;
    rows.push({
      groupId: group.id,
      groupName: group.name,
      kind: group.kind,
      tier: group.tier ?? undefined,
      strategy: policy?.strategy ?? 'manual',
      agents,
      unassigned,
      onShift: agents.filter((agent) => agent.onShift).length,
      available: agents.filter((agent) => agent.eligible).length,
    });
  }
  return rows;
}

export async function listEligibleAgents(groupId?: string): Promise<WfmEligibleAgent[]> {
  const session = await getSessionProfile();
  if (!session || session.profile.role === 'customer') return [];
  const supabase = await createSupabaseServerClient();
  if (groupId) {
    return listEligibleAgentsForGroup(supabase, session.profile.tenantId, groupId);
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('tenant_id', session.profile.tenantId)
    .in('role', ['admin', 'agent', 'team_lead', 'supervisor', 'manager', 'superadmin'])
    .order('full_name');
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? undefined,
    role: row.role as WfmEligibleAgent['role'],
    eligible: true,
    reasons: [],
    openTickets: 0,
    maxOpen: 8,
    presence: 'available' as const,
    onShift: true,
    skillIds: [],
  }));
}

export async function getMyPresence(): Promise<WfmPresenceStatus> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return 'available';
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_presence')
    .select('status')
    .eq('tenant_id', session.profile.tenantId)
    .eq('user_id', session.userId)
    .maybeSingle();
  return (data?.status as WfmPresenceStatus | undefined) ?? 'available';
}

export async function setMyPresence(input: unknown) {
  const parsed = presenceSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_presence')
    .upsert(
      {
        tenant_id: session.profile.tenantId,
        user_id: session.userId,
        status: parsed.status,
        until: parsed.until ?? null,
        created_by: session.userId,
      },
      { onConflict: 'tenant_id,user_id' },
    )
    .select('user_id, status, until, updated_at')
    .single();
  if (error || !data) return { data: null, error: error?.message ?? 'Unable to set presence' };
  revalidateWfm();
  return { data: { userId: data.user_id, status: data.status, until: data.until ?? undefined, updatedAt: data.updated_at } as WfmPresence, error: null };
}

export async function listShiftTemplates(): Promise<WfmShiftTemplate[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_shift_templates')
    .select('id, name, start_local, end_local, days, timezone, is_active')
    .eq('tenant_id', session.profile.tenantId)
    .order('start_local');
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    startLocal: String(row.start_local).slice(0, 5),
    endLocal: String(row.end_local).slice(0, 5),
    days: row.days ?? [],
    timezone: row.timezone,
    isActive: row.is_active,
  }));
}

export async function createShiftTemplate(input: unknown) {
  const parsed = shiftTemplateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_shift_templates')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      name: parsed.name,
      start_local: parsed.startLocal,
      end_local: parsed.endLocal,
      days: parsed.days,
      timezone: parsed.timezone,
      is_active: parsed.isActive,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function listRoster(fromDate: string, toDate: string, groupId?: string): Promise<WfmRosterEntry[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('wfm_roster_entries')
    .select('id, user_id, group_id, work_date, template_id, source, wfm_shift_templates(name, start_local, end_local)')
    .eq('tenant_id', session.profile.tenantId)
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .order('work_date');
  if (groupId) query = query.eq('group_id', groupId);
  const { data } = await query;
  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  return (data ?? []).map((row) => {
    const template = Array.isArray(row.wfm_shift_templates) ? row.wfm_shift_templates[0] : row.wfm_shift_templates;
    return {
      id: row.id,
      userId: row.user_id,
      userName: names.get(row.user_id),
      groupId: row.group_id,
      workDate: row.work_date,
      templateId: row.template_id,
      templateName: template?.name,
      startLocal: template ? String(template.start_local).slice(0, 5) : undefined,
      endLocal: template ? String(template.end_local).slice(0, 5) : undefined,
      source: row.source,
    };
  });
}

export async function upsertRosterEntry(input: unknown) {
  const parsedResult = rosterEntrySchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_roster_entries')
    .upsert(
      {
        tenant_id: session.profile.tenantId,
        user_id: parsed.userId,
        group_id: parsed.groupId,
        work_date: parsed.workDate,
        template_id: parsed.templateId,
        source: parsed.source,
        created_by: session.userId,
      },
      { onConflict: 'user_id,group_id,work_date' },
    )
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function importRosterFile(formData: FormData) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { data: null, error: 'Choose a .csv or .xlsx file.' };
  }

  const parsedFile = await parseImportFile(file);
  if (parsedFile.error) return { data: null, error: parsedFile.error };
  if (parsedFile.rows.length === 0) return { data: null, error: 'The file has no data rows.' };
  if (parsedFile.rows.length > ROSTER_IMPORT_MAX) {
    return { data: null, error: `Maximum ${ROSTER_IMPORT_MAX} rows per upload.` };
  }

  const defaultGroupId = String(formData.get('groupId') ?? '').trim();
  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  const [{ data: profiles }, { data: groups }, templates] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').eq('tenant_id', tenantId),
    supabase.from('assignment_groups').select('id, name, slug').eq('tenant_id', tenantId).eq('is_active', true),
    listShiftTemplates(),
  ]);

  const staff = (profiles ?? []).filter((row) => isStaffRole(row.role));
  const byEmail = new Map(staff.map((row) => [String(row.email ?? '').trim().toLowerCase(), row.id]));
  const byName = new Map(staff.map((row) => [keyName(row.full_name), row.id]));
  const groupByKey = new Map<string, string>();
  for (const group of groups ?? []) {
    groupByKey.set(keyName(group.name), group.id);
    if (group.slug) groupByKey.set(keyName(group.slug), group.id);
  }
  const shiftByKey = new Map<string, string>();
  for (const template of templates.filter((item) => item.isActive !== false)) {
    shiftByKey.set(keyName(template.name), template.id);
    shiftByKey.set(keyName(`${template.startLocal}-${template.endLocal}`), template.id);
  }

  const rows = mapRosterImportRows(parsedFile.rows);
  const errors: string[] = [];
  const payload: Array<{
    tenant_id: string;
    user_id: string;
    group_id: string;
    work_date: string;
    template_id: string;
    source: 'planned';
    created_by: string;
  }> = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    const workDate = parseWorkDate(row.workDate);
    if (!workDate) {
      errors.push(`Row ${line}: invalid date.`);
      return;
    }
    const userId =
      (row.email ? byEmail.get(row.email.toLowerCase()) : undefined) ??
      (row.name ? byName.get(keyName(row.name)) : undefined);
    if (!userId) {
      errors.push(`Row ${line}: agent not found (${row.email || row.name || 'empty'}).`);
      return;
    }
    const groupId = row.group ? groupByKey.get(keyName(row.group)) : defaultGroupId;
    if (!groupId) {
      errors.push(`Row ${line}: ${row.group ? `group not found (${row.group})` : 'group is required'}.`);
      return;
    }
    const templateId = row.shift ? shiftByKey.get(keyName(row.shift)) : undefined;
    if (!templateId) {
      errors.push(`Row ${line}: shift not found (${row.shift || 'empty'}).`);
      return;
    }
    const key = `${userId}:${groupId}:${workDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    payload.push({
      tenant_id: tenantId,
      user_id: userId,
      group_id: groupId,
      work_date: workDate,
      template_id: templateId,
      source: 'planned',
      created_by: session.userId,
    });
  });

  if (payload.length === 0) {
    return { data: null, error: errors[0] ?? 'No valid roster rows.' };
  }

  const { error } = await supabase.from('wfm_roster_entries').upsert(payload, {
    onConflict: 'user_id,group_id,work_date',
  });
  if (error) return { data: null, error: error.message };

  revalidateWfm();
  return {
    data: { imported: payload.length, failed: errors.length, errors: errors.slice(0, 12) },
    error: errors.length ? `${payload.length} imported. ${errors.length} row(s) skipped.` : null,
  };
}

export async function deleteRosterEntry(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('wfm_roster_entries').delete().eq('id', id).eq('tenant_id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data: { id }, error: null };
}

export async function listTimeOff(): Promise<WfmTimeOff[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_time_off')
    .select('id, user_id, starts_at, ends_at, type, status, note')
    .eq('tenant_id', session.profile.tenantId)
    .order('starts_at', { ascending: false })
    .limit(40);
  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: names.get(row.user_id),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    type: row.type,
    status: row.status,
    note: row.note ?? undefined,
  }));
}

export async function createTimeOff(input: unknown) {
  const parsed = timeOffSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const isLead = canRole(session.profile.role, 'create', 'Wfm');
  const userId = isLead ? parsed.userId : session.userId;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_time_off')
    .insert({
      tenant_id: session.profile.tenantId,
      user_id: userId,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      type: parsed.type,
      status: isLead ? 'approved' : 'pending',
      note: parsed.note ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function setTimeOffStatus(id: string, input: unknown) {
  const parsed = timeOffStatusSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('wfm_time_off')
    .update({ status: parsed.status })
    .eq('id', id)
    .eq('tenant_id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data: { id }, error: null };
}

export async function listSkills(): Promise<WfmSkill[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_skills')
    .select('id, name, slug, category')
    .eq('tenant_id', session.profile.tenantId)
    .order('name');
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, slug: row.slug, category: row.category ?? undefined }));
}

export async function createSkill(input: unknown) {
  const parsed = skillSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_skills')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.name,
      slug: slugify(parsed.name),
      category: parsed.category ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function listAgentSkills(): Promise<WfmAgentSkill[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_agent_skills')
    .select('id, user_id, skill_id, level')
    .eq('tenant_id', session.profile.tenantId);
  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)));
  const skillIds = Array.from(new Set((data ?? []).map((row) => row.skill_id)));
  const [{ data: profiles }, { data: skills }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id, full_name').in('id', userIds) : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    skillIds.length ? supabase.from('wfm_skills').select('id, name').in('id', skillIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  const skillNames = new Map((skills ?? []).map((row) => [row.id, row.name]));
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: names.get(row.user_id),
    skillId: row.skill_id,
    skillName: skillNames.get(row.skill_id),
    level: row.level,
  }));
}

export async function assignAgentSkill(input: unknown) {
  const parsed = agentSkillSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_agent_skills')
    .upsert(
      {
        tenant_id: session.profile.tenantId,
        user_id: parsed.userId,
        skill_id: parsed.skillId,
        level: parsed.level,
        created_by: session.userId,
      },
      { onConflict: 'user_id,skill_id' },
    )
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function removeAgentSkill(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('wfm_agent_skills').delete().eq('id', id).eq('tenant_id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data: { id }, error: null };
}

export async function getDispatchPolicy(groupId: string): Promise<WfmDispatchPolicy | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return null;
  const supabase = await createSupabaseServerClient();
  return loadDispatchPolicy(supabase, session.profile.tenantId, groupId);
}

export async function upsertDispatchPolicy(input: unknown) {
  const parsed = dispatchPolicySchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_dispatch_policies')
    .upsert(
      {
        tenant_id: session.profile.tenantId,
        group_id: parsed.groupId,
        strategy: parsed.strategy,
        max_open_tickets: parsed.maxOpenTickets,
        required_skill_ids: parsed.requiredSkillIds,
        oncall_group_id: parsed.oncallGroupId ?? null,
        is_active: parsed.isActive,
        created_by: session.userId,
      },
      { onConflict: 'group_id' },
    )
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath(`/org/groups/${parsed.groupId}`);
  revalidateWfm();
  return { data, error: null };
}

export async function listOncallRotations(): Promise<WfmOncallRotation[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  const { data: rotations } = await supabase
    .from('wfm_oncall_rotations')
    .select('id, group_id, name, cadence_hours, is_active')
    .eq('tenant_id', session.profile.tenantId)
    .order('name');
  const groupIds = Array.from(new Set((rotations ?? []).map((row) => row.group_id)));
  const rotationIds = (rotations ?? []).map((row) => row.id);
  const [{ data: groups }, { data: slots }] = await Promise.all([
    groupIds.length ? supabase.from('assignment_groups').select('id, name, account_id').in('id', groupIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; account_id: string }> }),
    rotationIds.length
      ? supabase
          .from('wfm_oncall_slots')
          .select('id, rotation_id, starts_at, ends_at, primary_user_id, backup_user_id')
          .eq('tenant_id', session.profile.tenantId)
          .in('rotation_id', rotationIds)
          .order('starts_at')
      : Promise.resolve({ data: [] as Array<{ id: string; rotation_id: string; starts_at: string; ends_at: string; primary_user_id: string; backup_user_id?: string | null }> }),
  ]);
  const visibleGroups = new Map(
    (groups ?? [])
      .filter((group) => !scoped.accountId || group.account_id === scoped.accountId)
      .map((group) => [group.id, group.name]),
  );
  const userIds = Array.from(new Set((slots ?? []).flatMap((slot) => [slot.primary_user_id, slot.backup_user_id].filter(Boolean) as string[])));
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  return (rotations ?? [])
    .filter((row) => visibleGroups.has(row.group_id))
    .map((row) => ({
      id: row.id,
      groupId: row.group_id,
      groupName: visibleGroups.get(row.group_id),
      name: row.name,
      cadenceHours: row.cadence_hours,
      isActive: row.is_active,
      slots: (slots ?? [])
        .filter((slot) => slot.rotation_id === row.id)
        .map((slot) => ({
          id: slot.id,
          rotationId: slot.rotation_id,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          primaryUserId: slot.primary_user_id,
          primaryName: names.get(slot.primary_user_id),
          backupUserId: slot.backup_user_id ?? undefined,
          backupName: slot.backup_user_id ? names.get(slot.backup_user_id) : undefined,
        })),
    }));
}

export async function createOncallRotation(input: unknown) {
  const parsed = oncallRotationSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_oncall_rotations')
    .insert({
      tenant_id: session.profile.tenantId,
      group_id: parsed.groupId,
      name: parsed.name,
      cadence_hours: parsed.cadenceHours,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function createOncallSlot(input: unknown) {
  const parsed = oncallSlotSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wfm_oncall_slots')
    .insert({
      tenant_id: session.profile.tenantId,
      rotation_id: parsed.rotationId,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      primary_user_id: parsed.primaryUserId,
      backup_user_id: parsed.backupUserId ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateWfm();
  return { data, error: null };
}

export async function getWfmForecast(): Promise<{ buckets: WfmForecastBucket[]; adherence: WfmAdherenceRow[] }> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return { buckets: [], adherence: [] };
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  const [buckets, adherence] = await Promise.all([
    computeForecast(supabase, session.profile.tenantId, scoped.accountId),
    computeAdherence(supabase, session.profile.tenantId),
  ]);
  return { buckets, adherence };
}

export async function dispatchTicketAction(ticketId: string, force = false) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const result = await dispatchTicket(session.profile.tenantId, ticketId, { client: supabase, force });
  if (!result.ok) return { data: null, error: result.error ?? 'Dispatch failed' };
  revalidatePath(`/tickets/${ticketId}`);
  return { data: result, error: null };
}
