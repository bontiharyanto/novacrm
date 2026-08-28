'use server';

import { getSessionProfile } from '@/lib/auth/session';
import {
  canManageCapabilities,
  buildCapabilityMatrix,
  capabilityUpdateSchema,
  type CapabilityAction,
  type CapabilityCell,
  type CapabilityOverride,
  type CapabilitySubject,
} from '@/lib/rbac/capabilities';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canRole } from '@/lib/rbac/ability';

export async function listCapabilityMatrix(): Promise<{ data: CapabilityCell[]; error: string | null }> {
  const session = await getSessionProfile();
  if (!session || !canManageCapabilities(session.profile.role)) {
    return { data: [], error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('role_capabilities')
    .select('role, action, subject, allowed')
    .eq('tenant_id', session.profile.tenantId);
  if (result.error) return { data: [], error: result.error.message };
  return { data: buildCapabilityMatrix(result.data ?? []), error: null };
}

export async function getSessionCapabilityOverrides(): Promise<CapabilityOverride[]> {
  const session = await getSessionProfile();
  if (!session) return [];
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('role_capabilities')
    .select('action, subject, allowed')
    .eq('tenant_id', session.profile.tenantId)
    .eq('role', session.profile.role);
  if (result.error) return [];
  return (result.data ?? []) as CapabilityOverride[];
}

export async function canAccessConfiguredCapability(
  action: CapabilityAction,
  subject: CapabilitySubject,
) {
  const session = await getSessionProfile();
  if (!session) return false;
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('role_capabilities')
    .select('allowed')
    .eq('tenant_id', session.profile.tenantId)
    .eq('role', session.profile.role)
    .eq('action', action)
    .eq('subject', subject)
    .maybeSingle();
  if (result.data) return Boolean(result.data.allowed);
  return canRole(session.profile.role, action, subject);
}

export async function updateCapability(input: unknown) {
  const parsed = capabilityUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid capability' };
  const session = await getSessionProfile();
  if (!session || !canManageCapabilities(session.profile.role)) return { data: null, error: 'Unauthorized' };
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('role_capabilities')
    .upsert({
      tenant_id: session.profile.tenantId,
      role: parsed.data.role,
      action: parsed.data.action,
      subject: parsed.data.subject,
      allowed: parsed.data.allowed,
      created_by: session.userId,
    }, { onConflict: 'tenant_id,role,action,subject' })
    .select('role, action, subject, allowed')
    .single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? 'Unable to update capability' };
  return { data: result.data, error: null };
}
