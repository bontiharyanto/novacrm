const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

const placeholderHosts = ['example.supabase.co', 'your-project.supabase.co'];
const placeholderKeys = ['your-anon-key', 'public-anon-key'];

export function getPublicSupabaseConfig() {
  return {
    url: process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    key: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
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

export function getEnv(name: (typeof requiredEnv)[number]) {
  return process.env[name] ?? '';
}

export function validateEnv() {
  const missing = requiredEnv.filter((item) => !process.env[item]);
  const configured = isSupabaseConfigured();

  return {
    ok: configured && missing.length === 0,
    missing: configured ? missing : [...missing, ...(configured ? [] : ['NEXT_PUBLIC_SUPABASE_URL'])],
  };
}
