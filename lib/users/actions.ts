'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole, canAssignRole, isCustomerRole, isTenantAdminRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupportTier, type SupportTier } from '@/lib/tickets/pending';
import { createUserSchema, highestSupportLevel, userAccessSchema, type DirectoryUser } from '@/lib/users/schema';
import type { AssignmentGroup, AssignmentGroupKind } from '@/lib/org/schema';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { formatZodError } from '@/lib/validation/zod-error';

type ProfileRow = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: DirectoryUser['role'];
  org_unit_id?: string | null;
};

function mapUsers(
  profiles: ProfileRow[],
  units: Map<string, string>,
  groupsByUser: Map<string, DirectoryUser['groups']>,
  accountsByUser: Map<string, DirectoryUser['accounts']>,
): DirectoryUser[] {
  return profiles.map((row) => {
    const groups = groupsByUser.get(row.id) ?? [];
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      role: row.role,
      orgUnitId: row.org_unit_id ?? undefined,
      orgUnitName: row.org_unit_id ? units.get(row.org_unit_id) : undefined,
      supportLevel: highestSupportLevel(groups.map((group) => group.tier)),
      groups,
      accounts: accountsByUser.get(row.id) ?? [],
    };
  });
}

async function loadDirectoryMaps(tenantId: string, userIds: string[]) {
  const supabase = await createSupabaseServerClient();
  const [{ data: units }, { data: memberships }, { data: accountRows }] = await Promise.all([
    supabase.from('org_units').select('id, name').eq('tenant_id', tenantId),
    userIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from('assignment_group_members')
          .select('id, group_id, user_id, role')
          .eq('tenant_id', tenantId)
          .in('user_id', userIds),
    userIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from('account_members')
          .select('account_id, user_id, role, accounts(id, name)')
          .eq('tenant_id', tenantId)
          .in('user_id', userIds),
  ]);

  const unitMap = new Map((units ?? []).map((unit) => [unit.id as string, unit.name as string]));
  const groupIds = Array.from(new Set((memberships ?? []).map((row) => row.group_id as string)));
  const { data: groups } =
    groupIds.length === 0
      ? { data: [] }
      : await supabase.from('assignment_groups').select('id, name, kind, tier').in('id', groupIds);
  const groupMap = new Map((groups ?? []).map((group) => [group.id as string, group]));

  const groupsByUser = new Map<string, DirectoryUser['groups']>();
  for (const row of memberships ?? []) {
    const group = groupMap.get(row.group_id as string);
    if (!group) continue;
    const list = groupsByUser.get(row.user_id as string) ?? [];
    list.push({
      membershipId: row.id as string,
      groupId: row.group_id as string,
      name: group.name as string,
      kind: group.kind as string,
      tier: isSupportTier(group.tier as string) ? (group.tier as SupportTier) : undefined,
      memberRole: row.role as 'lead' | 'member',
    });
    groupsByUser.set(row.user_id as string, list);
  }

  const accountsByUser = new Map<string, DirectoryUser['accounts']>();
  for (const row of accountRows ?? []) {
    const account = row.accounts as { id?: string; name?: string } | { id?: string; name?: string }[] | null;
    const record = Array.isArray(account) ? account[0] : account;
    if (!record?.id) continue;
    const list = accountsByUser.get(row.user_id as string) ?? [];
    list.push({
      accountId: record.id,
      name: record.name ?? record.id,
      memberRole: row.role as string,
    });
    accountsByUser.set(row.user_id as string, list);
  }

  return { unitMap, groupsByUser, accountsByUser };
}

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, org_unit_id')
    .eq('tenant_id', session.profile.tenantId)
    .order('full_name', { ascending: true });

  if (error || !data) return [];
  const maps = await loadDirectoryMaps(
    session.profile.tenantId,
    data.map((row) => row.id),
  );
  return mapUsers(data as ProfileRow[], maps.unitMap, maps.groupsByUser, maps.accountsByUser);
}

export async function getDirectoryUser(userId: string): Promise<DirectoryUser | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, org_unit_id')
    .eq('tenant_id', session.profile.tenantId)
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  const maps = await loadDirectoryMaps(session.profile.tenantId, [data.id]);
  return mapUsers([data as ProfileRow], maps.unitMap, maps.groupsByUser, maps.accountsByUser)[0] ?? null;
}

export async function listDirectoryGroups(): Promise<AssignmentGroup[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assignment_groups')
    .select('id, tenant_id, account_id, name, slug, kind, tier, is_active, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('is_active', true)
    .order('name');
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    slug: row.slug,
    kind: row.kind as AssignmentGroupKind,
    tier: isSupportTier(row.tier as string) ? (row.tier as SupportTier) : undefined,
    isActive: row.is_active,
    olaResponseMinutes: 45,
    olaResolveMinutes: 360,
    memberCount: 0,
    members: [],
    createdAt: row.created_at,
  }));
}

export async function listHomeUnits() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('org_units')
    .select('id, name, type')
    .eq('tenant_id', session.profile.tenantId)
    .order('type')
    .order('name');
  return (data ?? []) as Array<{ id: string; name: string; type: string }>;
}

export async function createDirectoryUser(input: unknown) {
  const parsedResult = createUserSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'User')) {
    return { data: null, error: 'Unauthorized' };
  }
  if (!canAssignRole(session.profile.role, parsed.role)) {
    return { data: null, error: 'You cannot assign that role' };
  }
  if (!hasServiceRole()) {
    return { data: null, error: 'Service role is not configured. Cannot create logins.' };
  }

  const supabase = await createSupabaseServerClient();
  const email = parsed.email.toLowerCase();
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', session.profile.tenantId)
    .ilike('email', email)
    .maybeSingle();
  if (existing) {
    return { data: null, error: 'Email is already used in this tenant' };
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, type')
    .eq('id', parsed.accountId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!account) return { data: null, error: 'Account not found' };
  if (isCustomerRole(parsed.role) && account.type === 'internal') {
    return { data: null, error: 'Portal users must join a customer account' };
  }

  const admin = createSupabaseAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.fullName,
      role: parsed.role,
      tenant_id: session.profile.tenantId,
    },
  });
  if (created.error || !created.data.user) {
    return { data: null, error: created.error?.message ?? 'Unable to create login' };
  }
  const userId = created.data.user.id;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.fullName,
      email,
      phone: parsed.phone ?? null,
      role: parsed.role,
      org_unit_id: parsed.orgUnitId ?? null,
      created_by: session.userId,
    })
    .eq('id', userId)
    .eq('tenant_id', session.profile.tenantId)
    .select('id')
    .maybeSingle();
  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(userId);
    return { data: null, error: profileError?.message ?? 'Profile was not created' };
  }

  const memberRole = isCustomerRole(parsed.role) ? 'portal' : 'member';
  const accountIds = new Set<string>([parsed.accountId]);
  if (!isCustomerRole(parsed.role)) {
    const { data: internal } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', session.profile.tenantId)
      .eq('type', 'internal')
      .maybeSingle();
    if (internal?.id) accountIds.add(internal.id);
  }

  const { error: memberError } = await supabase.from('account_members').insert(
    Array.from(accountIds).map((accountId) => ({
      tenant_id: session.profile.tenantId,
      account_id: accountId,
      user_id: userId,
      role: memberRole,
      created_by: session.userId,
    })),
  );
  if (memberError) {
    await admin.auth.admin.deleteUser(userId);
    return { data: null, error: memberError.message };
  }

  if (parsed.groupId && parsed.role !== 'customer') {
    const { data: group } = await supabase
      .from('assignment_groups')
      .select('id')
      .eq('id', parsed.groupId)
      .eq('tenant_id', session.profile.tenantId)
      .maybeSingle();
    if (!group) {
      await admin.auth.admin.deleteUser(userId);
      return { data: null, error: 'Group not found' };
    }
    const { error: groupError } = await supabase.from('assignment_group_members').insert({
      tenant_id: session.profile.tenantId,
      group_id: parsed.groupId,
      user_id: userId,
      role: 'member',
      created_by: session.userId,
    });
    if (groupError) {
      await admin.auth.admin.deleteUser(userId);
      return { data: null, error: groupError.message };
    }
  }

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  return { data: { id: userId }, error: null };
}

export async function updateUserAccess(userId: string, input: unknown) {
  const parsedResult = userAccessSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'User')) {
    return { data: null, error: 'Unauthorized' };
  }

  if (parsed.role && !canAssignRole(session.profile.role, parsed.role)) {
    return { data: null, error: 'You cannot assign that role' };
  }

  if (parsed.role && !isTenantAdminRole(parsed.role) && userId === session.userId && isTenantAdminRole(session.profile.role)) {
    const supabaseCount = await createSupabaseServerClient();
    const { count } = await supabaseCount
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', session.profile.tenantId)
      .in('role', ['admin', 'superadmin']);
    if ((count ?? 0) <= 1) {
      return { data: null, error: 'Cannot remove the last tenant admin' };
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.role !== undefined) patch.role = parsed.role;
  if (parsed.orgUnitId !== undefined) patch.org_unit_id = parsed.orgUnitId;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) return { data: null, error: error.message };
  if (parsed.role && hasServiceRole()) {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role: parsed.role },
    });
  }
  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  return { data: await getDirectoryUser(userId), error: null };
}
