'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isStaffRole, isTenantAdminRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { setWelcomeCookie } from '@/lib/auth/welcome';

export type MfaPolicy = {
  required: boolean;
  labLocked: boolean;
  slug: string;
};

export async function getMfaPolicy(tenantId?: string): Promise<MfaPolicy> {
  const session = await getSessionProfile();
  const id = tenantId ?? session?.profile.tenantId;
  if (!id) return { required: false, labLocked: false, slug: '' };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tenants').select('slug, mfa_required').eq('id', id).maybeSingle();
  const slug = (data?.slug as string | undefined) ?? '';
  const labLocked = slug === 'novacrm-demo';
  return {
    required: Boolean(data?.mfa_required) && !labLocked,
    labLocked,
    slug,
  };
}

export async function setMfaRequired(required: boolean) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('id', session.profile.tenantId)
    .maybeSingle();

  if (!tenant) return { data: null, error: 'Tenant not found' };
  if (tenant.slug === 'novacrm-demo' && required) {
    return { data: null, error: 'Lab tenant stays password-only. Enable MFA after production cutover.' };
  }

  const { error } = await supabase.from('tenants').update({ mfa_required: required }).eq('id', tenant.id);
  if (error) return { data: null, error: error.message };
  return { data: { required }, error: null };
}

export async function listOwnMfaFactors() {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: [], error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { data: [], error: error.message };
  return { data: data.totp ?? [], error: null };
}

export async function startMfaEnroll() {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'NovaCRM',
  });
  if (error || !data) return { data: null, error: error?.message ?? 'Unable to start TOTP' };
  return {
    data: {
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    },
    error: null,
  };
}

export async function verifyMfaEnroll(factorId: string, code: string) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { data: null, error: challenge.error?.message ?? 'Unable to challenge' };
  }
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verified.error) return { data: null, error: verified.error.message };
  return { data: { ok: true }, error: null };
}

export async function verifyMfaLogin(factorId: string, code: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Sign in first' };

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { data: null, error: challenge.error?.message ?? 'Unable to challenge' };
  }
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verified.error) return { data: null, error: verified.error.message };
  setWelcomeCookie();
  return { data: { ok: true }, error: null };
}

export async function unenrollOwnMfa(factorId: string) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { data: null, error: error.message };
  return { data: { ok: true }, error: null };
}

export async function resetUserMfa(userId: string) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role) || !hasServiceRole()) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, tenant_id')
    .eq('id', userId)
    .maybeSingle();
  if (!target || target.tenant_id !== session.profile.tenantId) {
    return { data: null, error: 'User not found' };
  }
  if (!isStaffRole(target.role)) {
    return { data: null, error: 'Portal users do not use desk MFA' };
  }

  const admin = createSupabaseAdminClient();
  const { data: factors, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) return { data: null, error: error.message };
  for (const factor of factors?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
  }
  return { data: { ok: true }, error: null };
}

export async function userHasPasswordIdentity() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const identities = user?.identities ?? [];
  if (identities.length === 0) return true;
  return identities.some((item) => item.provider === 'email');
}
