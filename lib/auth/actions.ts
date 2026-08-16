'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';
import { getPreferences } from '@/lib/preferences/server';
import { getDictionary } from '@/lib/i18n';
import { markPasswordChanged } from '@/lib/auth/password-policy';

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const store = cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-')) {
      store.delete(cookie.name);
    }
  }
  store.delete(ACCOUNT_COOKIE);

  redirect('/login');
}

export async function changeOwnPassword(currentPassword: string, nextPassword: string) {
  const session = await getSessionProfile();
  const copy = getDictionary(getPreferences().locale);
  if (!session?.profile.email) {
    return { data: null, error: copy.portal.passwordUnauthorized };
  }
  if (nextPassword.trim().length < 8) {
    return { data: null, error: copy.portal.passwordTooShort };
  }
  if (currentPassword === nextPassword) {
    return { data: null, error: copy.portal.passwordSame };
  }

  const supabase = await createSupabaseServerClient();
  const { error: currentError } = await supabase.auth.signInWithPassword({
    email: session.profile.email,
    password: currentPassword,
  });
  if (currentError) {
    return { data: null, error: copy.portal.passwordCurrentWrong };
  }

  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) {
    return { data: null, error: error.message };
  }
  await markPasswordChanged(session.userId);
  return { data: { ok: true }, error: null };
}
