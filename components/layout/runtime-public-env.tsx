import { getPublicSupabaseConfig } from '@/lib/config/env';

export function RuntimePublicEnv() {
  const { url, key } = getPublicSupabaseConfig();
  const payload = JSON.stringify({
    supabaseUrl: url,
    supabaseAnonKey: key,
  });

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__NOVACRM_ENV=${payload};`,
      }}
    />
  );
}
