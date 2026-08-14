'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ACCOUNT_ALL, ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { homePathForRole, isCustomerRole, parseAppRole } from '@/lib/rbac/roles';

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  const role = parseAppRole(profile?.role ?? data.user.user_metadata?.role);
  if (isCustomerRole(role)) {
    redirect(next && next.startsWith('/portal') ? next : '/portal');
  }

  cookies().set(ACCOUNT_COOKIE, ACCOUNT_ALL, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  const dest = next && !next.startsWith('/portal') ? next : homePathForRole(role);
  redirect(dest);
}
