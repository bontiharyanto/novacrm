import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerSupabaseConfig } from '@/lib/config/env';

export async function createSupabaseServerClient() {
  const { url, key } = getServerSupabaseConfig();

  if (!url || !key) {
    throw new Error('Supabase server client is not configured');
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware will refresh the session.
        }
      },
    },
  });
}
