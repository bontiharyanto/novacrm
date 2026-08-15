'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import {
  createTenantSchema,
  updateTenantSchema,
  type TenantRecord,
  type TenantStatus,
} from '@/lib/tenants/schema';
import { formatZodError } from '@/lib/validation/zod-error';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
  timezone: string;
  support_email?: string | null;
  status: TenantStatus;
  mfa_required?: boolean;
  created_at: string;
};

function mapTenant(row: TenantRow, counts?: { adminCount: number; userCount: number }): TenantRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    timezone: row.timezone,
    supportEmail: row.support_email ?? '',
    status: row.status,
    mfaRequired: Boolean(row.mfa_required),
    createdAt: row.created_at,
    adminCount: counts?.adminCount ?? 0,
    userCount: counts?.userCount ?? 0,
  };
}

async function requirePlatformAdmin(action: 'read' | 'create' | 'update' = 'read') {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, action, 'Tenant')) {
    return { session: null, error: 'Unauthorized' as const };
  }
  if (!hasServiceRole()) {
    return { session: null, error: 'Service role is not configured' as const };
  }
  return { session, error: null };
}

async function loadCounts(tenantIds: string[]) {
  const counts = new Map<string, { adminCount: number; userCount: number }>();
  for (const id of tenantIds) {
    counts.set(id, { adminCount: 0, userCount: 0 });
  }
  if (tenantIds.length === 0) return counts;

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('profiles').select('tenant_id, role').in('tenant_id', tenantIds);
  for (const row of data ?? []) {
    const current = counts.get(row.tenant_id as string);
    if (!current) continue;
    current.userCount += 1;
    if (row.role === 'admin' || row.role === 'superadmin') current.adminCount += 1;
  }
  return counts;
}

export async function listTenants(): Promise<TenantRecord[]> {
  const gate = await requirePlatformAdmin('read');
  if (gate.error || !gate.session) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('tenants').select('*').order('created_at', { ascending: true });
  if (error || !data) return [];

  const counts = await loadCounts(data.map((row) => row.id as string));
  return data.map((row) => mapTenant(row as TenantRow, counts.get(row.id as string)));
}

export async function getTenantById(tenantId: string): Promise<TenantRecord | null> {
  const gate = await requirePlatformAdmin('read');
  if (gate.error || !gate.session) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (!data) return null;
  const counts = await loadCounts([data.id as string]);
  return mapTenant(data as TenantRow, counts.get(data.id as string));
}

const SLA_TARGETS: Array<{ type: string; priority: string; response: number; resolve: number }> = [
  { type: 'incident', priority: 'critical', response: 30, resolve: 240 },
  { type: 'incident', priority: 'high', response: 60, resolve: 480 },
  { type: 'incident', priority: 'medium', response: 240, resolve: 1440 },
  { type: 'incident', priority: 'low', response: 480, resolve: 2880 },
  { type: 'request', priority: 'critical', response: 60, resolve: 480 },
  { type: 'request', priority: 'high', response: 120, resolve: 960 },
  { type: 'request', priority: 'medium', response: 480, resolve: 2880 },
  { type: 'request', priority: 'low', response: 960, resolve: 5760 },
  { type: 'problem', priority: 'critical', response: 60, resolve: 480 },
  { type: 'problem', priority: 'high', response: 120, resolve: 960 },
  { type: 'problem', priority: 'medium', response: 480, resolve: 2880 },
  { type: 'problem', priority: 'low', response: 960, resolve: 5760 },
  { type: 'change', priority: 'critical', response: 120, resolve: 480 },
  { type: 'change', priority: 'high', response: 240, resolve: 1440 },
  { type: 'change', priority: 'medium', response: 480, resolve: 2880 },
  { type: 'change', priority: 'low', response: 960, resolve: 5760 },
];

async function rollbackOnboarding(tenantId?: string, userId?: string) {
  if (!hasServiceRole()) return;
  const admin = createSupabaseAdminClient();
  if (tenantId) {
    await admin.from('assignment_group_members').delete().eq('tenant_id', tenantId);
    await admin.from('assignment_groups').delete().eq('tenant_id', tenantId);
    await admin.from('sla_targets').delete().eq('tenant_id', tenantId);
    await admin.from('sla_agreements').delete().eq('tenant_id', tenantId);
    await admin.from('sla_calendars').delete().eq('tenant_id', tenantId);
    await admin.from('account_members').delete().eq('tenant_id', tenantId);
    await admin.from('accounts').delete().eq('tenant_id', tenantId);
    await admin.from('profiles').delete().eq('tenant_id', tenantId);
    await admin.from('tenants').delete().eq('id', tenantId);
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
}

export async function createTenant(input: unknown) {
  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: formatZodError(parsed.error) };
  }

  const gate = await requirePlatformAdmin('create');
  if (gate.error || !gate.session) {
    return { data: null, error: gate.error ?? 'Unauthorized' };
  }

  const admin = createSupabaseAdminClient();
  const email = parsed.data.adminEmail.toLowerCase();
  const { data: slugTaken } = await admin.from('tenants').select('id').eq('slug', parsed.data.slug).maybeSingle();
  if (slugTaken) {
    return { data: null, error: 'That slug is already used' };
  }

  const { data: emailTaken } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle();
  if (emailTaken) {
    return { data: null, error: 'That admin email is already used' };
  }

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      accent_color: parsed.data.accentColor,
      timezone: parsed.data.timezone,
      support_email: parsed.data.supportEmail ?? null,
      status: 'active',
      created_by: gate.session.userId,
    })
    .select('*')
    .single();

  if (tenantError || !tenant) {
    return { data: null, error: tenantError?.message ?? 'Unable to create tenant' };
  }

  const tenantId = tenant.id as string;
  let userId: string | undefined;

  try {
    const { data: account, error: accountError } = await admin
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'internal',
        name: 'Internal',
        slug: 'internal',
        code: 'INT',
        status: 'active',
        created_by: gate.session.userId,
      })
      .select('id')
      .single();
    if (accountError || !account) {
      throw new Error(accountError?.message ?? 'Unable to create internal account');
    }

    const created = await admin.auth.admin.createUser({
      email,
      password: parsed.data.adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.adminName,
        role: 'admin',
        tenant_id: tenantId,
      },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? 'Unable to create admin login');
    }
    userId = created.data.user.id;

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: parsed.data.adminName,
        email,
        role: 'admin',
        created_by: gate.session.userId,
      })
      .eq('id', userId)
      .eq('tenant_id', tenantId);
    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: memberError } = await admin.from('account_members').insert({
      tenant_id: tenantId,
      account_id: account.id,
      user_id: userId,
      role: 'owner',
      created_by: gate.session.userId,
    });
    if (memberError) {
      throw new Error(memberError.message);
    }

    const { data: group, error: groupError } = await admin
      .from('assignment_groups')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        name: 'Service Desk',
        slug: 'service-desk',
        kind: 'assignment',
        tier: 'l1',
        is_active: true,
        ola_response_minutes: 30,
        ola_resolve_minutes: 240,
        party_kind: 'internal',
        created_by: gate.session.userId,
      })
      .select('id')
      .single();
    if (groupError || !group) {
      throw new Error(groupError?.message ?? 'Unable to create service desk group');
    }

    await admin.from('assignment_group_members').insert({
      tenant_id: tenantId,
      group_id: group.id,
      user_id: userId,
      role: 'lead',
      created_by: gate.session.userId,
    });

    const { data: calendar, error: calendarError } = await admin
      .from('sla_calendars')
      .insert({
        tenant_id: tenantId,
        account_id: null,
        name: 'Office hours',
        timezone: parsed.data.timezone,
        is_24x7: false,
        business_hours: {
          mon: [['08:00', '17:00']],
          tue: [['08:00', '17:00']],
          wed: [['08:00', '17:00']],
          thu: [['08:00', '17:00']],
          fri: [['08:00', '17:00']],
          sat: [],
          sun: [],
        },
        created_by: gate.session.userId,
      })
      .select('id')
      .single();
    if (calendarError || !calendar) {
      throw new Error(calendarError?.message ?? 'Unable to create SLA calendar');
    }

    const { data: agreement, error: agreementError } = await admin
      .from('sla_agreements')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        calendar_id: calendar.id,
        name: 'Internal office',
        pause_on_waiting: true,
        is_active: true,
        created_by: gate.session.userId,
      })
      .select('id')
      .single();
    if (agreementError || !agreement) {
      throw new Error(agreementError?.message ?? 'Unable to create SLA agreement');
    }

    const { error: targetError } = await admin.from('sla_targets').insert(
      SLA_TARGETS.map((target) => ({
        tenant_id: tenantId,
        agreement_id: agreement.id,
        ticket_type: target.type,
        priority: target.priority,
        response_minutes: target.response,
        resolve_minutes: target.resolve,
        created_by: gate.session.userId,
      })),
    );
    if (targetError) {
      throw new Error(targetError.message);
    }
  } catch (error) {
    await rollbackOnboarding(tenantId, userId);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unable to finish tenant setup',
    };
  }

  revalidatePath('/tenants');
  return {
    data: { id: tenantId, adminUserId: userId ?? '', slug: parsed.data.slug },
    error: null,
  };
}

export async function updateTenant(tenantId: string, input: unknown) {
  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: formatZodError(parsed.error) };
  }

  const gate = await requirePlatformAdmin('update');
  if (gate.error || !gate.session) {
    return { data: null, error: gate.error ?? 'Unauthorized' };
  }

  if (parsed.data.status && parsed.data.status !== 'active') {
    if (tenantId === DEMO_TENANT_ID) {
      return { data: null, error: 'The lab tenant cannot be paused or archived' };
    }
    if (tenantId === gate.session.profile.tenantId) {
      return { data: null, error: 'You cannot pause the tenant you are signed into' };
    }
  }

  const admin = createSupabaseAdminClient();
  if (parsed.data.slug) {
    const { data: slugTaken } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', parsed.data.slug)
      .neq('id', tenantId)
      .maybeSingle();
    if (slugTaken) {
      return { data: null, error: 'That slug is already used' };
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug;
  if (parsed.data.accentColor !== undefined) patch.accent_color = parsed.data.accentColor;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (parsed.data.supportEmail !== undefined) patch.support_email = parsed.data.supportEmail || null;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  const { data, error } = await admin.from('tenants').update(patch).eq('id', tenantId).select('*').single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update tenant' };
  }

  revalidatePath('/tenants');
  revalidatePath(`/tenants/${tenantId}`);
  const counts = await loadCounts([tenantId]);
  return { data: mapTenant(data as TenantRow, counts.get(tenantId)), error: null };
}

export async function setTenantStatus(tenantId: string, status: TenantStatus) {
  return updateTenant(tenantId, { status });
}
