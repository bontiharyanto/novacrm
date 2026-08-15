'use server';

import { revalidatePath } from 'next/cache';
import {
  assignmentGroupSchema,
  assignmentGroupUpdateSchema,
  groupMemberSchema,
  orgUnitSchema,
  orgUnitUpdateSchema,
  type AssignmentGroup,
  type AssignmentGroupMember,
  type OrgUnit,
} from '@/lib/org/schema';
import { requireAccountId } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { formatZodError } from '@/lib/validation/zod-error';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { defaultOlaMinutes } from '@/lib/ola/engine';

const GROUP_SELECT =
  'id, tenant_id, account_id, name, slug, kind, tier, is_active, ola_response_minutes, ola_resolve_minutes, party_kind, party_name, created_at';

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  );
}

type OrgUnitRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  parent_id?: string | null;
  type: OrgUnit['type'];
  name: string;
  slug: string;
  manager_id?: string | null;
  created_at: string;
};

type GroupRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  name: string;
  slug: string;
  kind: AssignmentGroup['kind'];
  tier?: AssignmentGroup['tier'] | null;
  is_active: boolean;
  ola_response_minutes?: number | null;
  ola_resolve_minutes?: number | null;
  party_kind?: AssignmentGroup['partyKind'] | null;
  party_name?: string | null;
  created_at: string;
};

function mapUnit(row: OrgUnitRow, managers?: Map<string, string>): OrgUnit {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    parentId: row.parent_id ?? undefined,
    type: row.type,
    name: row.name,
    slug: row.slug,
    managerId: row.manager_id ?? undefined,
    managerName: row.manager_id ? managers?.get(row.manager_id) : undefined,
    createdAt: row.created_at,
  };
}

async function withManagers(rows: OrgUnitRow[]): Promise<OrgUnit[]> {
  const ids = rows.map((row) => row.manager_id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return rows.map((row) => mapUnit(row));
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  const managers = new Map((data ?? []).map((row) => [row.id, row.full_name as string]));
  return rows.map((row) => mapUnit(row, managers));
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) return [];
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('org_units')
    .select('id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  if (scoped.accountId) {
    query = query.eq('account_id', scoped.accountId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return withManagers(data as OrgUnitRow[]);
}

export async function getOrgUnitById(unitId: string): Promise<OrgUnit | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('org_units')
    .select('id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_at')
    .eq('id', unitId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!data) return null;
  const [unit] = await withManagers([data as OrgUnitRow]);
  return unit;
}

export async function createOrgUnit(input: unknown) {
  const parsedResult = orgUnitSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return { data: null, error: scoped.error ?? 'Select an account' };

  if (parsed.type === 'unit' && !parsed.parentId) {
    return { data: null, error: 'Unit must belong to a division' };
  }
  if (parsed.type === 'division' && parsed.parentId) {
    return { data: null, error: 'Division cannot have a parent' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('org_units')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      parent_id: parsed.type === 'division' ? null : parsed.parentId,
      type: parsed.type,
      name: parsed.name.trim(),
      slug: parsed.slug?.trim() || slugify(parsed.name),
      manager_id: parsed.managerId ?? null,
      created_by: session.userId,
    })
    .select('id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_at')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create org unit' };
  }
  revalidatePath('/org');
  const [unit] = await withManagers([data as OrgUnitRow]);
  return { data: unit, error: null };
}

export async function updateOrgUnit(unitId: string, input: unknown) {
  const parsed = orgUnitUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }
  const existing = await getOrgUnitById(unitId);
  if (!existing) return { data: null, error: 'Org unit not found' };

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name.trim();
  if (parsed.slug !== undefined) patch.slug = parsed.slug.trim() || slugify(parsed.name ?? existing.name);
  if (parsed.managerId !== undefined) patch.manager_id = parsed.managerId ?? null;
  if (parsed.parentId !== undefined && existing.type === 'unit') patch.parent_id = parsed.parentId;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('org_units')
    .update(patch)
    .eq('id', unitId)
    .eq('tenant_id', session.profile.tenantId)
    .select('id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_at')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update org unit' };
  }
  revalidatePath('/org');
  revalidatePath(`/org/units/${unitId}`);
  const [unit] = await withManagers([data as OrgUnitRow]);
  return { data: unit, error: null };
}

async function loadGroupMembers(groupIds: string[]): Promise<Map<string, AssignmentGroupMember[]>> {
  const result = new Map<string, AssignmentGroupMember[]>();
  if (groupIds.length === 0) return result;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('assignment_group_members')
    .select('id, group_id, user_id, role')
    .in('group_id', groupIds);
  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] };
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  for (const row of rows) {
    const profile = byId.get(row.user_id);
    const list = result.get(row.group_id) ?? [];
    list.push({
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role,
      fullName: profile?.full_name,
      email: profile?.email ?? undefined,
    });
    result.set(row.group_id, list);
  }
  return result;
}

function mapGroup(
  row: GroupRow,
  members: AssignmentGroupMember[],
  userId?: string,
): AssignmentGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    tier: row.tier ?? undefined,
    isActive: row.is_active,
    olaResponseMinutes: row.ola_response_minutes ?? defaultOlaMinutes(row.tier).response,
    olaResolveMinutes: row.ola_resolve_minutes ?? defaultOlaMinutes(row.tier).resolve,
    partyKind: row.party_kind ?? 'internal',
    partyName: row.party_name ?? undefined,
    memberCount: members.length,
    isMember: userId ? members.some((member) => member.userId === userId) : false,
    members,
    createdAt: row.created_at,
  };
}

export async function listAssignmentGroups(accountId?: string | null): Promise<AssignmentGroup[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) return [];
  const scoped = await requireAccountId(session, accountId);
  if (accountId && !scoped.accountId) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('assignment_groups')
    .select(GROUP_SELECT)
    .eq('tenant_id', session.profile.tenantId)
    .order('name');
  if (scoped.accountId) {
    query = query.eq('account_id', scoped.accountId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  const members = await loadGroupMembers(data.map((row) => row.id));
  return data.map((row) => mapGroup(row as GroupRow, members.get(row.id) ?? [], session.userId));
}

export async function getAssignmentGroupById(groupId: string): Promise<AssignmentGroup | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('assignment_groups')
    .select(GROUP_SELECT)
    .eq('id', groupId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!data) return null;
  const members = await loadGroupMembers([data.id]);
  return mapGroup(data as GroupRow, members.get(data.id) ?? [], session.userId);
}

export async function createAssignmentGroup(input: unknown) {
  const parsed = assignmentGroupSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return { data: null, error: scoped.error ?? 'Select an account' };
  if (parsed.partyKind && parsed.partyKind !== 'internal' && !parsed.partyName?.trim()) {
    return { data: null, error: 'Vendor / principal name is required' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assignment_groups')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      name: parsed.name.trim(),
      slug: parsed.slug?.trim() || slugify(parsed.name),
      kind: parsed.kind,
      tier: parsed.tier ?? null,
      is_active: parsed.isActive ?? true,
      ola_response_minutes: parsed.olaResponseMinutes ?? defaultOlaMinutes(parsed.tier).response,
      ola_resolve_minutes: parsed.olaResolveMinutes ?? defaultOlaMinutes(parsed.tier).resolve,
      party_kind: parsed.partyKind ?? 'internal',
      party_name: parsed.partyKind && parsed.partyKind !== 'internal' ? parsed.partyName?.trim() || null : null,
      created_by: session.userId,
    })
    .select(GROUP_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create group' };
  }

  await supabase.from('assignment_group_members').insert({
    tenant_id: session.profile.tenantId,
    group_id: data.id,
    user_id: session.userId,
    role: 'lead',
    created_by: session.userId,
  });

  revalidatePath('/org');
  return { data: await getAssignmentGroupById(data.id), error: null };
}

export async function updateAssignmentGroup(groupId: string, input: unknown) {
  const parsed = assignmentGroupUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name.trim();
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.kind !== undefined) patch.kind = parsed.kind;
  if (parsed.tier !== undefined) patch.tier = parsed.tier ?? null;
  if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;
  if (parsed.olaResponseMinutes !== undefined) patch.ola_response_minutes = parsed.olaResponseMinutes;
  if (parsed.olaResolveMinutes !== undefined) patch.ola_resolve_minutes = parsed.olaResolveMinutes;
  if (parsed.partyKind !== undefined) patch.party_kind = parsed.partyKind;
  if (parsed.partyName !== undefined || parsed.partyKind !== undefined) {
    const kind = parsed.partyKind ?? 'internal';
    patch.party_name = kind === 'internal' ? null : parsed.partyName?.trim() || null;
    if (kind !== 'internal' && !patch.party_name) {
      return { data: null, error: 'Vendor / principal name is required' };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('assignment_groups')
    .update(patch)
    .eq('id', groupId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) return { data: null, error: error.message };
  revalidatePath('/org');
  revalidatePath(`/org/groups/${groupId}`);
  return { data: await getAssignmentGroupById(groupId), error: null };
}

export async function addGroupMember(groupId: string, input: unknown) {
  const parsedResult = groupMemberSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }
  const group = await getAssignmentGroupById(groupId);
  if (!group) return { data: null, error: 'Group not found' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('assignment_group_members').insert({
    tenant_id: session.profile.tenantId,
    group_id: groupId,
    user_id: parsed.userId,
    role: parsed.role,
    created_by: session.userId,
  });
  if (error) return { data: null, error: error.message };
  revalidatePath(`/org/groups/${groupId}`);
  revalidatePath('/users');
  revalidatePath(`/users/${parsed.userId}`);
  return { data: true, error: null };
}

export async function removeGroupMember(groupId: string, memberId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Org')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('assignment_group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId)
    .eq('tenant_id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  revalidatePath(`/org/groups/${groupId}`);
  revalidatePath('/users');
  return { data: true, error: null };
}
