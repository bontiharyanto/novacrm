import { tenantAccessState } from '@/lib/tenants/lifecycle';
import {
  TENANT_HEALTH_TEMPLATE,
  TENANT_OPENAPI_TEMPLATE,
  TENANT_WEBHOOK_TEMPLATE,
  tenantBackendUrls,
  tenantOpenApiServers,
} from '@/lib/tenants/backend-url';
import type { TenantSlugRecord } from '@/lib/tenants/resolve-slug';

export function tenantBackendCatalog(tenant: TenantSlugRecord) {
  const urls = tenantBackendUrls(tenant.slug, tenant.publicUrl);
  return {
    apiVersion: urls.apiVersion,
    uriTemplate: urls.uriTemplate,
    healthTemplate: TENANT_HEALTH_TEMPLATE,
    webhookTemplate: TENANT_WEBHOOK_TEMPLATE,
    openapiTemplate: TENANT_OPENAPI_TEMPLATE,
    header: urls.header,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    access: tenantAccessState(tenant),
    accentColor: tenant.accentColor,
    loginUrl: urls.login,
    backendUrl: urls.base,
    healthUrl: urls.health,
    openapiUrl: urls.openapi,
    webhooks: urls.webhooks,
    servers: tenantOpenApiServers(tenant.slug, tenant.publicUrl),
  };
}
