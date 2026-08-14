'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isCustomerRole, STAFF_ROLES } from '@/lib/rbac/roles';
import { listEligibleAgentsForGroup } from '@/lib/wfm/eligible';
import type { WfmEligibleAgent } from '@/lib/wfm/schema';

export type AssignableAgent = WfmEligibleAgent;

export async function listAssignableAgents(groupId?: string): Promise<AssignableAgent[]> {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  if (groupId) {
    return listEligibleAgentsForGroup(supabase, session.profile.tenantId, groupId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('tenant_id', session.profile.tenantId)
    .in('role', [...STAFF_ROLES])
    .order('full_name', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? undefined,
    role: row.role as AssignableAgent['role'],
    eligible: true,
    reasons: [],
    openTickets: 0,
    maxOpen: 8,
    presence: 'available' as const,
    onShift: true,
    skillIds: [],
  }));
}
