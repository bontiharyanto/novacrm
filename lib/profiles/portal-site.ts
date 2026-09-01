'use server';

import { z } from 'zod';
import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ipv4Schema } from '@/lib/cmdb/schema';

const siteSchema = z.string().trim().max(120);
const clientIpSchema = z.union([z.literal(''), ipv4Schema]);

export async function getPortalSite() {
  const session = await getSessionProfile();
  if (!session || !isCustomerRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  return {
    data: {
      site: session.profile.site ?? '',
      clientIp: session.profile.clientIp ?? '',
    },
    error: null,
  };
}

export async function updatePortalSite(input: { site?: string; clientIp?: string }) {
  const session = await getSessionProfile();
  if (!session || !isCustomerRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const siteParsed = siteSchema.safeParse(input.site ?? '');
  if (!siteParsed.success) {
    return { data: null, error: 'Site is too long' };
  }
  const ipParsed = clientIpSchema.safeParse(input.clientIp ?? '');
  if (!ipParsed.success) {
    return { data: null, error: 'Workstation IP is not valid' };
  }

  const supabase = await createSupabaseServerClient();
  const siteValue = siteParsed.data.length > 0 ? siteParsed.data : null;
  const ipValue = ipParsed.data.length > 0 ? ipParsed.data : null;
  const { error } = await supabase
    .from('profiles')
    .update({ site: siteValue, client_ip: ipValue })
    .eq('id', session.userId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { site: siteValue ?? '', clientIp: ipValue ?? '' }, error: null };
}
