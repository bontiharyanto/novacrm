import { getSessionProfile } from '@/lib/auth/session';
import { canRole, isTenantAdminRole } from '@/lib/rbac/ability';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const DEFAULT_PASSWORD_MAX_AGE_DAYS = 30;

export type PasswordPolicy = {
  enabled: boolean;
  maxAgeDays: number;
};

export type PasswordStatus = {
  expired: boolean;
  daysLeft: number;
  changedAt?: string;
};

export function isPasswordExpired(changedAt: string | null | undefined, policy: PasswordPolicy) {
  if (!policy.enabled) return false;
  if (!changedAt) return true;
  const ageMs = Date.now() - new Date(changedAt).getTime();
  return ageMs >= policy.maxAgeDays * 86_400_000;
}

export function daysUntilPasswordExpiry(changedAt: string | null | undefined, policy: PasswordPolicy) {
  if (!policy.enabled) return policy.maxAgeDays;
  if (!changedAt) return 0;
  const due = new Date(changedAt).getTime() + policy.maxAgeDays * 86_400_000;
  return Math.max(0, Math.ceil((due - Date.now()) / 86_400_000));
}

export function passwordStatus(changedAt: string | null | undefined, policy: PasswordPolicy): PasswordStatus {
  return {
    expired: isPasswordExpired(changedAt, policy),
    daysLeft: daysUntilPasswordExpiry(changedAt, policy),
    changedAt: changedAt ?? undefined,
  };
}

export async function getPasswordPolicy(tenantId?: string): Promise<PasswordPolicy> {
  const session = await getSessionProfile();
  const id = tenantId ?? session?.profile.tenantId;
  if (!id) {
    return { enabled: true, maxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS };
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('password_rotation_enabled, password_max_age_days')
    .eq('id', id)
    .maybeSingle();
  return {
    enabled: data?.password_rotation_enabled !== false,
    maxAgeDays: Number(data?.password_max_age_days ?? DEFAULT_PASSWORD_MAX_AGE_DAYS),
  };
}

export async function getOwnPasswordStatus() {
  const session = await getSessionProfile();
  if (!session) return { policy: { enabled: true, maxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS }, status: passwordStatus(null, { enabled: true, maxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS }) };
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, policy] = await Promise.all([
    supabase.from('profiles').select('password_changed_at').eq('id', session.userId).maybeSingle(),
    getPasswordPolicy(session.profile.tenantId),
  ]);
  return { policy, status: passwordStatus(profile?.password_changed_at as string | undefined, policy) };
}

export async function markPasswordChanged(userId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from('profiles').update({ password_changed_at: new Date().toISOString() }).eq('id', userId);
}

export async function savePasswordPolicy(input: { enabled: boolean; maxAgeDays: number }) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const maxAgeDays = Math.min(365, Math.max(7, Math.round(input.maxAgeDays) || DEFAULT_PASSWORD_MAX_AGE_DAYS));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tenants')
    .update({
      password_rotation_enabled: input.enabled,
      password_max_age_days: maxAgeDays,
    })
    .eq('id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  return { data: { enabled: input.enabled, maxAgeDays }, error: null };
}

export async function resetUserPassword(userId: string, nextPassword: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'User') || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  if (nextPassword.trim().length < 8) {
    return { data: null, error: 'Use at least 8 characters.' };
  }
  if (!hasServiceRole()) {
    return { data: null, error: 'Service role is not configured. Cannot reset passwords.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!target) return { data: null, error: 'User not found' };

  const admin = createSupabaseAdminClient();
  const updated = await admin.auth.admin.updateUserById(userId, { password: nextPassword.trim() });
  if (updated.error) {
    return { data: null, error: updated.error.message };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ password_changed_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('tenant_id', session.profile.tenantId);
  if (error) return { data: null, error: error.message };
  return { data: { ok: true }, error: null };
}
