import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import { isAppRole, parseAppRole, type AppRole } from '@/lib/rbac/roles';
import type { SsoOauthProvider, SsoProviderOption } from '@/lib/auth/sso-types';

export type { SsoProviderOption, SsoOauthProvider };

const CATALOG: Record<string, Omit<SsoProviderOption, 'kind' | 'ready'>> = {
  sso_google: { label: 'Continue with Google', provider: 'google' },
  sso_entra: { label: 'Continue with Microsoft', provider: 'azure' },
  sso_okta: {
    label: 'Continue with Okta',
    provider: 'custom:okta',
    hint: 'Add a custom Okta provider in Supabase Auth (name: okta), then set the OIDC client ID.',
  },
  sso_saml: {
    label: 'Continue with SAML',
    provider: null,
    hint: 'SAML ACS is not wired. Use Google, Microsoft, Okta, or email login.',
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasClientId(config: Record<string, unknown>) {
  const clientId = typeof config.clientId === 'string' ? config.clientId.trim() : '';
  return clientId.length > 4;
}

export function parseAllowedDomains(config: Record<string, unknown>) {
  const raw = typeof config.allowedDomains === 'string' ? config.allowedDomains : '';
  return raw
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function parseDefaultSsoRole(config: Record<string, unknown>): AppRole {
  const role = typeof config.defaultRole === 'string' ? config.defaultRole : 'agent';
  return isAppRole(role) && role !== 'superadmin' ? role : 'agent';
}

export async function resolvePublicTenant(slug?: string | null) {
  const fallbackId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
  if (!hasServiceRole()) {
    return { id: fallbackId, slug: slug?.trim() || 'novacrm-demo' };
  }
  const supabase = createSupabaseAdminClient();
  const wanted = slug?.trim();
  if (wanted) {
    const { data } = await supabase.from('tenants').select('id, slug').eq('slug', wanted).maybeSingle();
    if (data) return { id: data.id as string, slug: data.slug as string };
  }
  const { data } = await supabase.from('tenants').select('id, slug').eq('id', fallbackId).maybeSingle();
  return {
    id: (data?.id as string | undefined) ?? fallbackId,
    slug: (data?.slug as string | undefined) ?? 'novacrm-demo',
  };
}

export async function listPublicSsoOptions(tenantSlug?: string | null) {
  if (!hasServiceRole()) return [] as SsoProviderOption[];
  const tenant = await resolvePublicTenant(tenantSlug);
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('kind, config, is_active')
    .eq('tenant_id', tenant.id)
    .in('kind', Object.keys(CATALOG))
    .eq('is_active', true);

  const options: SsoProviderOption[] = [];
  for (const row of data ?? []) {
    const meta = CATALOG[row.kind];
    if (!meta) continue;
    const config = asRecord(row.config);
    const ready = Boolean(meta.provider) && hasClientId(config);
    options.push({
      kind: row.kind,
      label: meta.label,
      provider: (meta.provider ?? null) as SsoOauthProvider | null,
      ready,
      tenantSlug: tenant.slug,
      hint: ready ? undefined : meta.hint,
    });
  }
  return options;
}

export async function loadSsoPolicy(tenantId: string) {
  if (!hasServiceRole()) {
    return { allowedDomains: [] as string[], defaultRole: 'agent' as AppRole, restrictDomains: false };
  }
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('config, is_active')
    .eq('tenant_id', tenantId)
    .in('kind', ['sso_google', 'sso_entra', 'sso_okta'])
    .eq('is_active', true);

  const allowed = new Set<string>();
  let defaultRole: AppRole = 'agent';
  for (const row of data ?? []) {
    const config = asRecord(row.config);
    for (const domain of parseAllowedDomains(config)) allowed.add(domain);
    defaultRole = parseDefaultSsoRole(config);
  }
  return {
    allowedDomains: Array.from(allowed),
    defaultRole,
    restrictDomains: allowed.size > 0,
  };
}

export async function finalizeSsoProfile(input: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  tenantSlug?: string | null;
}): Promise<{ role: AppRole; error?: string }> {
  if (!hasServiceRole()) {
    return { role: 'customer', error: 'sso' };
  }
  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { role: 'customer', error: 'sso_email' };
  }

  const supabase = createSupabaseAdminClient();
  const tenant = await resolvePublicTenant(input.tenantSlug);
  const domain = email.split('@')[1] ?? '';
  const policy = await loadSsoPolicy(tenant.id);

  const { data: self } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name, email, phone, telegram_chat_id, org_unit_id')
    .eq('id', input.userId)
    .maybeSingle();

  const { data: invited } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name, email, phone, telegram_chat_id, org_unit_id')
    .ilike('email', email)
    .neq('id', input.userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (invited) {
    await supabase
      .from('profiles')
      .update({
        tenant_id: invited.tenant_id,
        role: invited.role,
        full_name: invited.full_name || input.fullName || email.split('@')[0],
        email,
        phone: invited.phone,
        telegram_chat_id: invited.telegram_chat_id,
        org_unit_id: invited.org_unit_id,
      })
      .eq('id', input.userId);
    await copyMemberships(supabase, invited.id, input.userId, invited.tenant_id);
    return { role: parseAppRole(invited.role) };
  }

  const domainAllowed = policy.allowedDomains.includes(domain);
  if (policy.restrictDomains && !domainAllowed) {
    return { role: parseAppRole(self?.role), error: 'sso_denied' };
  }

  const nextRole = domainAllowed ? policy.defaultRole : parseAppRole(self?.role);
  await supabase
    .from('profiles')
    .update({
      tenant_id: tenant.id,
      role: nextRole,
      email,
      full_name: self?.full_name || input.fullName || email.split('@')[0],
    })
    .eq('id', input.userId);

  return { role: nextRole };
}

async function copyMemberships(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  fromUserId: string,
  toUserId: string,
  tenantId: string,
) {
  const [{ data: accounts }, { data: groups }] = await Promise.all([
    supabase.from('account_members').select('account_id, role').eq('user_id', fromUserId),
    supabase.from('assignment_group_members').select('group_id, role').eq('user_id', fromUserId),
  ]);

  if (accounts?.length) {
    await supabase.from('account_members').upsert(
      accounts.map((row) => ({
        tenant_id: tenantId,
        account_id: row.account_id,
        user_id: toUserId,
        role: row.role,
        created_by: toUserId,
      })),
      { onConflict: 'account_id,user_id' },
    );
  }
  if (groups?.length) {
    await supabase.from('assignment_group_members').upsert(
      groups.map((row) => ({
        tenant_id: tenantId,
        group_id: row.group_id,
        user_id: toUserId,
        role: row.role,
        created_by: toUserId,
      })),
      { onConflict: 'group_id,user_id' },
    );
  }
}
