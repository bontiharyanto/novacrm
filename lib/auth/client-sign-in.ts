'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { ACCOUNT_ALL, ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { WELCOME_COOKIE } from '@/lib/auth/welcome-cookie';
import { homePathForRole, isCustomerRole, parseAppRole } from '@/lib/rbac/roles';

export type ClientSignInResult = { error: string } | { redirectTo: string };

function safeNextPath(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

function withWelcomeQuery(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('welcome=')) return path;
  const hashIdx = path.indexOf('#');
  const base = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : '';
  return `${base}${base.includes('?') ? '&' : '?'}welcome=1${hash}`;
}

export async function clientSignIn(
  email: string,
  password: string,
  next?: string,
): Promise<ClientSignInResult> {
  const supabase = createSupabaseBrowserClient();
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
    const { data: tenant } = await supabase
      .from('tenants')
      .select('status, mfa_required, slug')
      .eq('id', profile.tenant_id)
      .maybeSingle();

    if (tenant?.status && tenant.status !== 'active') {
      await supabase.auth.signOut();
      return { error: 'This tenant is paused or archived. Ask the platform owner to resume it.' };
    }

    if (tenant?.mfa_required && tenant.slug !== 'novacrm-demo') {
      const factors = await supabase.auth.mfa.listFactors();
      const enrolled = factors.data?.totp.some((item) => item.status === 'verified');
      return { redirectTo: enrolled ? '/login/mfa' : '/settings/security?enroll=1' };
    }
  }

  const role = parseAppRole(profile?.role ?? data.user.user_metadata?.role);
  document.cookie = `${ACCOUNT_COOKIE}=${ACCOUNT_ALL}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  document.cookie = `${WELCOME_COOKIE}=1; path=/; max-age=60; samesite=lax`;

  const safeNext = safeNextPath(next ?? '');
  let dest: string;
  if (isCustomerRole(role)) {
    dest = safeNext && safeNext.startsWith('/portal') && safeNext !== '/portal' ? safeNext : '/portal';
  } else {
    dest = safeNext && !safeNext.startsWith('/portal') ? safeNext : homePathForRole(role);
  }

  return { redirectTo: withWelcomeQuery(dest) };
}
