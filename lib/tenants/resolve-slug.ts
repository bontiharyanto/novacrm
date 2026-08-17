import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { isTenantLoginBlocked, type TenantLifecycle } from '@/lib/tenants/lifecycle';
import { tenantSlugSchema } from '@/lib/tenants/schema';

export type TenantSlugRecord = TenantLifecycle & {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  publicUrl?: string;
};

export async function loadTenantBySlug(slug?: string | null): Promise<TenantSlugRecord | null> {
  const parsed = tenantSlugSchema.safeParse(slug?.trim() ?? '');
  if (!parsed.success || !hasServiceRole()) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('tenants')
    .select('id, name, slug, status, accent_color, public_url, is_protected, expires_at, grace_days')
    .eq('slug', parsed.data)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    accentColor: (data.accent_color as string) || '#3b82f6',
    publicUrl: (data.public_url as string | null) ?? undefined,
    status: data.status as TenantLifecycle['status'],
    isProtected: Boolean(data.is_protected),
    expiresAt: (data.expires_at as string | null) ?? null,
    graceDays: Number(data.grace_days ?? 7),
  };
}

export function isTenantBackendBlocked(tenant: TenantSlugRecord) {
  return isTenantLoginBlocked(tenant);
}
