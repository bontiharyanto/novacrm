import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/lib/config/env';

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin client is not configured');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasServiceRole() {
  return Boolean(getPublicSupabaseConfig().url && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
