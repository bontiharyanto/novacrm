import { NextRequest, NextResponse } from 'next/server';
import { tenantBackendCatalog } from '@/lib/tenants/backend-catalog';
import { tenantHeaderMatches } from '@/lib/tenants/backend-url';
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

  return NextResponse.json({ data: tenantBackendCatalog(tenant), error: null });
}
