import { NextRequest, NextResponse } from 'next/server';
import { tenantAccessState } from '@/lib/tenants/lifecycle';
import { tenantHeaderMatches } from '@/lib/tenants/backend-url';
import { isTenantBackendBlocked, loadTenantBySlug } from '@/lib/tenants/resolve-slug';

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

  const access = tenantAccessState(tenant);
  const blocked = isTenantBackendBlocked(tenant);

  return NextResponse.json(
    {
      data: {
        status: blocked ? 'blocked' : 'ok',
        slug: tenant.slug,
        access,
        timestamp: new Date().toISOString(),
      },
      error: null,
    },
    { status: blocked ? 503 : 200 },
  );
}
