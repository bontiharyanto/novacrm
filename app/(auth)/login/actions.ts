'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  const role = String(data.user?.user_metadata?.role ?? '');
  if (next) {
    redirect(next);
  }
  redirect(role === 'customer' ? '/portal' : '/dashboard');
}
