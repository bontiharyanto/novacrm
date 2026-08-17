import { getAppUrl, normalizePublicUrl } from '@/lib/notifications/public-url';

export const TENANT_API_VERSION = 'v1';
export const TENANT_HEADER = 'X-Tenant-Id';
/** RFC 6570 / OpenAPI path template. Canonical for NovaCRM. */
export const TENANT_URI_TEMPLATE = '{+origin}/api/v1/t/{tenant}';
export const TENANT_HEALTH_TEMPLATE = '{+origin}/api/v1/t/{tenant}/health';
export const TENANT_WEBHOOK_TEMPLATE = '{+origin}/api/v1/t/{tenant}/webhooks/{channel}';
export const TENANT_OPENAPI_TEMPLATE = '{+origin}/api/v1/t/{tenant}/openapi.json';

export const TENANT_WEBHOOK_CHANNELS = ['generic', 'whatsapp', 'telegram', 'email', 'alerts'] as const;
export type TenantWebhookChannel = (typeof TENANT_WEBHOOK_CHANNELS)[number];

export function tenantOrigin(publicUrl?: string | null) {
  return normalizePublicUrl(publicUrl || '') || getAppUrl();
}

export function tenantBackendBase(slug: string, publicUrl?: string | null) {
  return `${tenantOrigin(publicUrl)}/api/${TENANT_API_VERSION}/t/${slug}`;
}

export function tenantLoginUrl(slug: string, publicUrl?: string | null) {
  return `${tenantOrigin(publicUrl)}/login?tenant=${encodeURIComponent(slug)}`;
}

export function tenantBackendUrls(slug: string, publicUrl?: string | null) {
  const base = tenantBackendBase(slug, publicUrl);
  return {
    apiVersion: TENANT_API_VERSION,
    uriTemplate: TENANT_URI_TEMPLATE,
    header: TENANT_HEADER,
    base,
    health: `${base}/health`,
    openapi: `${base}/openapi.json`,
    login: tenantLoginUrl(slug, publicUrl),
    webhooks: {
      generic: `${base}/webhooks/generic`,
      whatsapp: `${base}/webhooks/whatsapp`,
      telegram: `${base}/webhooks/telegram`,
      email: `${base}/webhooks/email`,
      alerts: `${base}/webhooks/alerts`,
    },
  };
}

export function tenantOpenApiServers(slug: string, publicUrl?: string | null) {
  const origin = tenantOrigin(publicUrl);
  return [
    {
      url: `${origin}/api/v1/t/{tenant}`,
      description: 'Path-based tenant API (OpenAPI 3)',
      variables: {
        tenant: { default: slug, description: 'Tenant slug' },
      },
    },
  ];
}

export function tenantHeaderMatches(request: { headers: { get(name: string): string | null } }, slug: string) {
  const header = request.headers.get(TENANT_HEADER)?.trim() || request.headers.get('x-tenant-id')?.trim();
  if (!header) return true;
  return header === slug;
}
