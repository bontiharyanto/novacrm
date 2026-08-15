import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';

export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
  );
}

export function normalizePublicUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${path === '/' ? '' : path}`;
  } catch {
    return null;
  }
}

export async function loadTenantPublicUrl(tenantId?: string) {
  if (!tenantId || !hasServiceRole()) return getAppUrl();
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from('tenants').select('public_url').eq('id', tenantId).maybeSingle();
  return data?.public_url || getAppUrl();
}
