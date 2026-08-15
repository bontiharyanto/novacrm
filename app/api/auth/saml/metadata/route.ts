import { NextRequest, NextResponse } from 'next/server';
import { createSamlClient, loadSamlIdp, safeSlug } from '@/lib/auth/saml';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const tenantSlug = safeSlug(request.nextUrl.searchParams.get('tenant'));
  const idp = await loadSamlIdp(tenantSlug || null);
  if (!idp) {
    return new NextResponse('SAML is not configured', { status: 404 });
  }

  const saml = createSamlClient(request.nextUrl.origin, idp);
  const xml = saml.generateServiceProviderMetadata(null, null);
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'content-type': 'application/samlmetadata+xml; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
