'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { DEFAULT_IDLE_MINUTES, parseIdleMinutes } from '@/lib/auth/idle-timeout';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantFieldsSchema } from '@/lib/tenants/schema';
import { isTenantObjectKey } from '@/lib/tickets/activity';

export type TenantConfig = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  timezone: string;
  supportEmail: string;
  status: 'active' | 'paused' | 'archived';
  idleTimeoutMinutes: number;
  logoObjectKey?: string;
};

function mapTenant(row: {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
  timezone: string;
  support_email?: string | null;
  status: TenantConfig['status'];
  idle_timeout_minutes?: number | null;
  logo_object_key?: string | null;
}): TenantConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    timezone: row.timezone,
    supportEmail: row.support_email ?? '',
    status: row.status,
    idleTimeoutMinutes: parseIdleMinutes(row.idle_timeout_minutes ?? DEFAULT_IDLE_MINUTES),
    logoObjectKey: row.logo_object_key ?? undefined,
  };
}

export async function getTenantConfig(tenantId?: string) {
  const session = await getSessionProfile();
  if (!session) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId ?? session.profile.tenantId)
    .maybeSingle();

  return data ? mapTenant(data) : null;
}

export async function upsertTenantConfig(
  input: Partial<Pick<TenantConfig, 'name' | 'slug' | 'accentColor' | 'timezone' | 'supportEmail'>> & {
    logoObjectKey?: string | null;
    id?: string;
  },
) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const { logoObjectKey, ...tenantFields } = input;
  const parsed = tenantFieldsSchema.partial().safeParse(tenantFields);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid tenant settings' };
  if (logoObjectKey && !isTenantObjectKey(session.profile.tenantId, logoObjectKey)) {
    return { data: null, error: 'Invalid logo object key' };
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.slug) {
    const { data: slugTaken } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', parsed.data.slug)
      .neq('id', session.profile.tenantId)
      .maybeSingle();
    if (slugTaken) return { data: null, error: 'That slug is already used' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug;
  if (parsed.data.accentColor !== undefined) patch.accent_color = parsed.data.accentColor;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (parsed.data.supportEmail !== undefined) patch.support_email = parsed.data.supportEmail || null;
  if (logoObjectKey !== undefined) patch.logo_object_key = logoObjectKey || null;

  const { data, error } = await supabase
    .from('tenants')
    .update(patch)
    .eq('id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to save tenant' };
  }

  return { data: mapTenant(data), error: null };
}
