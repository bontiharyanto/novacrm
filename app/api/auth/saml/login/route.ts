import { NextRequest, NextResponse } from 'next/server';
import { createSamlClient, encodeRelayState, loadSamlIdp, safeNextPath, safeSlug } from '@/lib/auth/saml';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const tenantSlug = safeSlug(request.nextUrl.searchParams.get('tenant'));
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const idp = await loadSamlIdp(tenantSlug || null);
  if (!idp) {
    return NextResponse.redirect(new URL(`/login?error=sso${tenantSlug ? `&tenant=${tenantSlug}` : ''}`, request.url));
  }

  const saml = createSamlClient(request.nextUrl.origin, idp);
  const url = await saml.getAuthorizeUrlAsync(encodeRelayState(idp.tenantSlug, nextPath), undefined, {});
  return NextResponse.redirect(url);
}
