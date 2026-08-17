'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { DEFAULT_IDLE_MINUTES, parseIdleMinutes, type IdleMinutes } from '@/lib/auth/idle-timeout';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getIdlePolicy(tenantId?: string): Promise<{ minutes: IdleMinutes }> {
  const session = await getSessionProfile();
  const id = tenantId ?? session?.profile.tenantId;
  if (!id) return { minutes: DEFAULT_IDLE_MINUTES };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tenants').select('idle_timeout_minutes').eq('id', id).maybeSingle();
  return { minutes: parseIdleMinutes(data?.idle_timeout_minutes) };
}

export async function saveIdlePolicy(input: { minutes: number }) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const minutes = parseIdleMinutes(input.minutes);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tenants')
    .update({ idle_timeout_minutes: minutes })
    .eq('id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  return { data: { minutes }, error: null };
}
