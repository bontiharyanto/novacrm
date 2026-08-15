'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
