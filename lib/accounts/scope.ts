import { cookies } from 'next/headers';
import { getSessionProfile, type AppSession } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AccountRecord, AccountScope } from '@/lib/accounts/schema';

export const ACCOUNT_COOKIE = 'novacrm_account';

type AccountRow = {
  id: string;
  tenant_id: string;
  type: AccountRecord['type'];
  name: string;
  slug: string;
  code?: string | null;
  status: AccountRecord['status'];
  created_at: string;
};

export function mapAccount(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    code: row.code ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listAccessibleAccounts(session?: AppSession | null): Promise<AccountRecord[]> {
  const current = session ?? (await getSessionProfile());
  if (!current) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, tenant_id, type, name, slug, code, status, created_at')
    .eq('tenant_id', current.profile.tenantId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapAccount(row as AccountRow));
}

export async function getAccountScope(session?: AppSession | null): Promise<AccountScope & { session: AppSession | null }> {
  const current = session ?? (await getSessionProfile());
  if (!current) {
    return { session: null, accounts: [], account: null };
  }

  const all = await listAccessibleAccounts(current);
  const accounts = all.filter((item) => item.status === 'active');
  if (current.profile.role === 'customer') {
    return { session: current, accounts, account: accounts[0] ?? null };
  }

  const cookieId = cookies().get(ACCOUNT_COOKIE)?.value;
  const account =
    accounts.find((item) => item.id === cookieId) ??
    accounts.find((item) => item.type === 'internal') ??
    accounts[0] ??
    null;

  return { session: current, accounts, account };
}

export async function requireAccountId(session?: AppSession | null, requested?: string | null) {
  const scope = await getAccountScope(session);
  if (!scope.session) return { accountId: null, error: 'Unauthorized', scope };
  if (scope.session.profile.role === 'customer') {
    if (!scope.account) return { accountId: null, error: 'No customer account assigned', scope };
    return { accountId: scope.account.id, error: null, scope };
  }
  const accountId = requested || scope.account?.id || null;
  if (!accountId || !scope.accounts.some((item) => item.id === accountId)) {
    return { accountId: null, error: 'Select an account', scope };
  }
  return { accountId, error: null, scope };
}
