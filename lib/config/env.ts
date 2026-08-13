type RequiredEnv = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

const placeholderHosts = ['example.supabase.co', 'your-project.supabase.co'];
const placeholderKeys = ['your-anon-key', 'public-anon-key'];

export function getPublicSupabaseConfig() {
  const env = process.env;
  return {
    url: env.NOVACRM_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: env.NOVACRM_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

export function getServerSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig();
  return {
    url: process.env['SUPABASE_INTERNAL_URL'] || publicConfig.url,
    key: publicConfig.key,
  };
}

export function isSupabaseConfigured(url?: string, key?: string) {
  const resolvedUrl = url ?? getPublicSupabaseConfig().url;
  const resolvedKey = key ?? getPublicSupabaseConfig().key;
  if (!resolvedUrl || !resolvedKey) return false;
  if (placeholderHosts.some((host) => resolvedUrl.includes(host))) return false;
  if (placeholderKeys.includes(resolvedKey)) return false;
  return true;
}

export function getEnv(name: RequiredEnv) {
  return process.env[name] ?? '';
}

export function validateEnv() {
  const { url, key } = getPublicSupabaseConfig();
  const missing = [
    ...(!url ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
    ...(!key ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
  ];
  const configured = isSupabaseConfigured(url, key);

  return {
    ok: configured,
    missing,
  };
}
