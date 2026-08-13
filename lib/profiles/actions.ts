'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AssignableAgent = {
  id: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'agent';
};

export async function listAssignableAgents(): Promise<AssignableAgent[]> {
  const session = await getSessionProfile();
  if (!session || session.profile.role === 'customer') {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('tenant_id', session.profile.tenantId)
    .in('role', ['admin', 'agent'])
    .order('full_name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? undefined,
    role: row.role as 'admin' | 'agent',
  }));
}
