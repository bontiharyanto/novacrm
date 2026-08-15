import { SAML, ValidateInResponseTo } from '@node-saml/node-saml';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSamlConfig, resolvePublicTenant } from '@/lib/auth/sso';

export type SamlIdpConfig = {
  tenantId: string;
  tenantSlug: string;
  idpEntityId?: string;
  ssoUrl: string;
  certificate: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizePem(raw: string) {
  const trimmed = raw.trim().replace(/\\n/g, '\n');
  if (trimmed.includes('BEGIN CERTIFICATE')) return trimmed;
  const body = trimmed.replace(/\s+/g, '');
  const lines = body.match(/.{1,64}/g)?.join('\n') ?? body;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
}

export function safeNextPath(value?: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

export function safeSlug(value?: string | null) {
  return value && /^[a-z0-9-]{2,80}$/.test(value) ? value : '';
}

export function encodeRelayState(tenantSlug: string, nextPath: string) {
  return `${tenantSlug}|${nextPath}`;
}

export function decodeRelayState(value?: string | null) {
  const raw = value ?? '';
  const [slug = '', next = ''] = raw.split('|');
  return { tenantSlug: safeSlug(slug), nextPath: safeNextPath(next) };
}

export async function loadSamlIdp(tenantSlug?: string | null): Promise<SamlIdpConfig | null> {
  if (!hasServiceRole()) return null;
  const tenant = await resolvePublicTenant(tenantSlug);
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('integrations')
    .select('config, is_active')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'sso_saml')
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  const config = asRecord(data.config);
  if (!hasSamlConfig(config)) return null;
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    idpEntityId: typeof config.idpEntityId === 'string' ? config.idpEntityId.trim() : undefined,
    ssoUrl: String(config.ssoUrl).trim(),
    certificate: String(config.certificate),
  };
}

export function samlCallbackUrl(origin: string) {
  return `${origin}/api/auth/saml/acs`;
}

export function samlIssuer(origin: string) {
  return `${origin}/api/auth/saml/metadata`;
}

export function createSamlClient(origin: string, idp: SamlIdpConfig) {
  return new SAML({
    callbackUrl: samlCallbackUrl(origin),
    issuer: samlIssuer(origin),
    audience: samlIssuer(origin),
    entryPoint: idp.ssoUrl,
    idpCert: normalizePem(idp.certificate),
    idpIssuer: idp.idpEntityId || undefined,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 5_000,
    validateInResponseTo: ValidateInResponseTo.never,
  });
}

export function emailFromSamlProfile(profile: Record<string, unknown> | null) {
  if (!profile) return '';
  const candidates = [
    profile.email,
    profile.mail,
    profile.nameID,
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.includes('@')) return value.trim().toLowerCase();
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].includes('@')) {
      return value[0].trim().toLowerCase();
    }
  }
  return '';
}

export function nameFromSamlProfile(profile: Record<string, unknown> | null, email: string) {
  const candidates = [profile?.displayName, profile?.cn, profile?.name, profile?.givenName];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return email.split('@')[0] ?? email;
}

export async function createSessionFromSamlEmail(input: { email: string; fullName: string }) {
  const admin = createSupabaseAdminClient();
  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: input.email,
    options: {
      data: {
        auth_via: 'saml',
        full_name: input.fullName,
      },
    },
  });
  if (link.error || !link.data.properties?.hashed_token) {
    return { user: null, error: link.error?.message ?? 'Unable to start SAML session' };
  }

  const supabase = await createSupabaseServerClient();
  const verified = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: link.data.properties.hashed_token,
  });
  if (verified.error || !verified.data.user) {
    return { user: null, error: verified.error?.message ?? 'Unable to verify SAML session' };
  }

  await admin.auth.admin.updateUserById(verified.data.user.id, {
    user_metadata: {
      ...(verified.data.user.user_metadata ?? {}),
      auth_via: 'saml',
      full_name: input.fullName,
    },
  });

  return { user: verified.data.user, error: null };
}
