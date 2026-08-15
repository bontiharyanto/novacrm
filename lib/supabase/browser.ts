import { createBrowserClient } from '@supabase/ssr';

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storageKey: string;
};

declare global {
  interface Window {
    __NOVACRM_ENV?: { supabaseUrl: string; supabaseAnonKey: string };
  }
}

function lanAwareSupabaseUrl(url: string) {
  if (typeof window === 'undefined' || !url) return url;
  const pageHost = window.location.hostname;
  if (pageHost === 'localhost' || pageHost === '127.0.0.1') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return url;
    parsed.hostname = pageHost;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function configuredSupabaseUrl() {
  if (typeof window !== 'undefined' && window.__NOVACRM_ENV?.supabaseUrl) {
    return window.__NOVACRM_ENV.supabaseUrl;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function authStorageKey(url: string) {
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return 'sb-127-auth-token';
  }
}

function readPublicEnv(): PublicEnv {
  const configuredUrl = configuredSupabaseUrl();
  const fromWindow = typeof window !== 'undefined' ? window.__NOVACRM_ENV : undefined;
  return {
    supabaseUrl: lanAwareSupabaseUrl(configuredUrl),
    supabaseAnonKey: fromWindow?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    storageKey: authStorageKey(configuredUrl),
  };
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey, storageKey } = readPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser client is not configured');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: storageKey },
  });
}
