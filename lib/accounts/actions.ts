'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACCOUNT_ALL, ACCOUNT_COOKIE, accountMemberSchema, accountSchema, accountUpdateSchema, type AccountMember, type AccountRecord } from '@/lib/accounts/schema';
import { getAccountScope, listAccessibleAccounts, mapAccount } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'account';
}

function writeAccountCookie(value: string) {
  cookies().set(ACCOUNT_COOKIE, value, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setActiveAccount(accountId: string) {
  const scope = await getAccountScope();
  if (!scope.session) {
    return { data: null, error: 'Unauthorized' };
  }

  if (accountId === ACCOUNT_ALL) {
    writeAccountCookie(ACCOUNT_ALL);
    revalidatePath('/', 'layout');
    return { data: { id: ACCOUNT_ALL }, error: null };
  }

  if (!scope.accounts.some((item) => item.id === accountId)) {
    return { data: null, error: 'Account not available' };
  }

  writeAccountCookie(accountId);
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('profiles')
    .update({ last_account_id: accountId })
    .eq('id', scope.session.userId)
    .eq('tenant_id', scope.session.profile.tenantId);
  revalidatePath('/', 'layout');
  return { data: { id: accountId }, error: null };
}

export async function listAccounts() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Account')) {
    return [];
  }
  return listAccessibleAccounts(session);
}

export async function getAccountById(accountId: string): Promise<AccountRecord | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Account')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, tenant_id, type, name, slug, code, status, created_at')
    .eq('id', accountId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  return data ? mapAccount(data) : null;
}

export async function listAccountMembers(accountId: string): Promise<AccountMember[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Account')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('account_members')
    .select('id, account_id, user_id, role, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email, role').in('id', userIds)
      : { data: [] };
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const profile = byId.get(row.user_id);
    return {
      id: row.id,
      accountId: row.account_id,
      userId: row.user_id,
      role: row.role,
      fullName: profile?.full_name,
      email: profile?.email ?? undefined,
      appRole: profile?.role,
      createdAt: row.created_at,
    };
  });
}

export async function createAccount(input: unknown) {
  const parsed = accountSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Account')) {
    return { data: null, error: 'Unauthorized' };
  }

  if (parsed.type === 'internal') {
    return { data: null, error: 'Internal account already exists for this tenant' };
  }

  const supabase = await createSupabaseServerClient();
  const slug = parsed.slug?.trim() || slugify(parsed.name);

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: session.profile.tenantId,
      type: 'customer',
      name: parsed.name.trim(),
      slug,
      code: parsed.code ?? null,
      status: parsed.status,
      created_by: session.userId,
    })
    .select('id, tenant_id, type, name, slug, code, status, created_at')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create account' };
  }

  await supabase.from('account_members').insert({
    tenant_id: session.profile.tenantId,
    account_id: data.id,
    user_id: session.userId,
    role: 'owner',
    created_by: session.userId,
  });

  revalidatePath('/accounts');
  return { data: mapAccount(data), error: null };
}

export async function updateAccount(accountId: string, input: unknown) {
  const parsed = accountUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Account')) {
    return { data: null, error: 'Unauthorized' };
  }

  const existing = await getAccountById(accountId);
  if (!existing) {
    return { data: null, error: 'Account not found' };
  }
  if (existing.type === 'internal' && parsed.type && parsed.type !== 'internal') {
    return { data: null, error: 'Cannot change the Internal account type' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name.trim();
  if (parsed.slug !== undefined) patch.slug = parsed.slug.trim() || slugify(parsed.name ?? existing.name);
  if (parsed.code !== undefined) patch.code = parsed.code ?? null;
  if (parsed.status !== undefined) patch.status = parsed.status;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', accountId)
    .eq('tenant_id', session.profile.tenantId)
    .select('id, tenant_id, type, name, slug, code, status, created_at')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update account' };
  }

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${accountId}`);
  return { data: mapAccount(data), error: null };
}

export async function addAccountMember(accountId: string, input: unknown) {
  const parsedResult = accountMemberSchema.safeParse(input);
  if (!parsedResult.success) {
    return { data: null, error: formatZodError(parsedResult.error) };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Account')) {
    return { data: null, error: 'Unauthorized' };
  }

  const account = await getAccountById(accountId);
  if (!account) {
    return { data: null, error: 'Account not found' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', parsed.userId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  if (!profile) {
    return { data: null, error: 'User not found' };
  }

  const role = profile.role === 'customer' ? 'portal' : parsed.role === 'portal' ? 'member' : parsed.role;

  const { error } = await supabase.from('account_members').insert({
    tenant_id: session.profile.tenantId,
    account_id: accountId,
    user_id: parsed.userId,
    role,
    created_by: session.userId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/accounts/${accountId}`);
  return { data: true, error: null };
}

export async function removeAccountMember(accountId: string, memberId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Account')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('account_members')
    .delete()
    .eq('id', memberId)
    .eq('account_id', accountId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/accounts/${accountId}`);
  return { data: true, error: null };
}

export async function listTenantProfiles() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Account')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('tenant_id', session.profile.tenantId)
    .order('full_name');

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name as string,
    email: (row.email as string | null) ?? undefined,
    role: row.role as string,
  }));
}
