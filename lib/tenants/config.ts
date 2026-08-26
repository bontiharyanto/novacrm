'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { DEFAULT_IDLE_MINUTES, parseIdleMinutes } from '@/lib/auth/idle-timeout';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

export async function upsertTenantConfig(input: Partial<TenantConfig> & { id?: string }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Tenant')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tenants')
    .update({
      name: input.name,
      slug: input.slug,
      accent_color: input.accentColor,
      timezone: input.timezone,
      support_email: input.supportEmail,
      status: input.status,
    })
    .eq('id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to save tenant' };
  }

  return { data: mapTenant(data), error: null };
}
