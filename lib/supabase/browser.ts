import { createBrowserClient } from '@supabase/ssr';

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

declare global {
  interface Window {
    __NOVACRM_ENV?: PublicEnv;
  }
}

function readPublicEnv(): PublicEnv {
  if (typeof window !== 'undefined' && window.__NOVACRM_ENV?.supabaseUrl) {
    return window.__NOVACRM_ENV;
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = readPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser client is not configured');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
