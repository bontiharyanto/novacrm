'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ACCOUNT_ALL, ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { homePathForRole, isCustomerRole, parseAppRole } from '@/lib/rbac/roles';
import { setWelcomeCookie, withWelcomeQuery } from '@/lib/auth/welcome';

export type SignInState = { error: string } | null;

function safeNextPath(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '';
}

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(String(formData.get('next') ?? ''));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.tenant_id) {
    const { data: tenant } = await supabase.from('tenants').select('status').eq('id', profile.tenant_id).maybeSingle();
    if (tenant?.status && tenant.status !== 'active') {
      await supabase.auth.signOut();
      return { error: 'This tenant is paused or archived. Ask the platform owner to resume it.' };
    }
  }

  const role = parseAppRole(profile?.role ?? data.user.user_metadata?.role);
  if (isCustomerRole(role)) {
    setWelcomeCookie();
    const dest = next && next.startsWith('/portal') && next !== '/portal' ? next : '/portal';
    redirect(withWelcomeQuery(dest));
  }

  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('mfa_required, slug')
      .eq('id', profile.tenant_id)
      .maybeSingle();
    if (tenant?.mfa_required && tenant.slug !== 'novacrm-demo') {
      const factors = await supabase.auth.mfa.listFactors();
      const enrolled = factors.data?.totp.some((item) => item.status === 'verified');
      redirect(enrolled ? '/login/mfa' : '/settings/security?enroll=1');
    }
  }

  cookies().set(ACCOUNT_COOKIE, ACCOUNT_ALL, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  const dest = next && !next.startsWith('/portal') ? next : homePathForRole(role);
  setWelcomeCookie();
  redirect(withWelcomeQuery(dest));
}
