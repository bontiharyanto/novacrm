import { NextRequest, NextResponse } from 'next/server';
import { tenantBackendUrls, tenantHeaderMatches, tenantOpenApiServers } from '@/lib/tenants/backend-url';
import { loadTenantBySlug } from '@/lib/tenants/resolve-slug';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const tenant = await loadTenantBySlug(params.slug);
  if (!tenant) {
    return NextResponse.json({ data: null, error: 'Tenant not found' }, { status: 404 });
  }
  if (!tenantHeaderMatches(request, tenant.slug)) {
    return NextResponse.json({ data: null, error: 'X-Tenant-Id does not match path tenant' }, { status: 400 });
  }

  const urls = tenantBackendUrls(tenant.slug, tenant.publicUrl);

  return NextResponse.json({
    openapi: '3.0.3',
    info: {
      title: `${tenant.name} tenant API`,
      version: urls.apiVersion,
      description: 'Path-based multi-tenant API. Tenant is the URL slug. Optional header X-Tenant-Id must match.',
    },
    servers: tenantOpenApiServers(tenant.slug, tenant.publicUrl),
    paths: {
      '/': {
        get: {
          summary: 'Tenant catalog',
          parameters: [{ $ref: '#/components/parameters/TenantHeader' }],
          responses: { '200': { description: 'Catalog' }, '404': { description: 'Unknown tenant' } },
        },
      },
      '/health': {
        get: {
          summary: 'Tenant health',
          parameters: [{ $ref: '#/components/parameters/TenantHeader' }],
          responses: { '200': { description: 'Active' }, '503': { description: 'Paused or expired' } },
        },
      },
      '/webhooks/{channel}': {
        post: {
          summary: 'Inbound webhook',
          parameters: [
            { $ref: '#/components/parameters/TenantHeader' },
            {
              name: 'channel',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['generic', 'whatsapp', 'telegram', 'email', 'alerts'] },
            },
          ],
          security: [{ webhookSecret: [] }],
          responses: { '200': { description: 'Accepted' }, '401': { description: 'Unauthorized' } },
        },
      },
    },
    components: {
      parameters: {
        TenantHeader: {
          name: 'X-Tenant-Id',
          in: 'header',
          required: false,
          schema: { type: 'string', default: tenant.slug },
          description: 'Optional. Must match the {tenant} path variable when sent.',
        },
      },
      securitySchemes: {
        webhookSecret: { type: 'apiKey', in: 'header', name: 'x-webhook-secret' },
      },
    },
  });
}
