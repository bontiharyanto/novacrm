import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import type { SsoProviderOption } from '@/lib/auth/sso-types';

export type { SsoProviderOption };

const CATALOG: Record<string, Omit<SsoProviderOption, 'kind' | 'ready'>> = {
  sso_google: { label: 'Continue with Google', provider: 'google' },
  sso_entra: { label: 'Continue with Microsoft', provider: 'azure' },
  sso_okta: {
    label: 'Continue with Okta',
    provider: null,
    hint: 'Okta is saved. Enable the matching provider in Supabase Auth, or keep email login.',
  },
  sso_saml: {
    label: 'Continue with SAML',
    provider: null,
    hint: 'SAML ACS is not wired in this release. Use email login.',
  },
};

function hasClientId(config: Record<string, unknown>) {
  const clientId = typeof config.clientId === 'string' ? config.clientId.trim() : '';
  return clientId.length > 4;
}

export async function listPublicSsoOptions(tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID) {
  if (!hasServiceRole()) return [] as SsoProviderOption[];

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('kind, config, is_active')
    .eq('tenant_id', tenantId)
    .in('kind', Object.keys(CATALOG))
    .eq('is_active', true);

  const options: SsoProviderOption[] = [];
  for (const row of data ?? []) {
    const meta = CATALOG[row.kind];
    if (!meta) continue;
    const config = (row.config ?? {}) as Record<string, unknown>;
    const ready = Boolean(meta.provider) && hasClientId(config);
    options.push({
      kind: row.kind,
      label: meta.label,
      provider: meta.provider,
      ready,
      hint: ready ? undefined : meta.hint,
    });
  }
  return options;
}
