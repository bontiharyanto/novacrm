import { NextRequest, NextResponse } from 'next/server';
import { getPortalSite, updatePortalSite } from '@/lib/profiles/portal-site';

export async function GET() {
  const result = await getPortalSite();
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 400 });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await updatePortalSite({
    site: body.site != null ? String(body.site) : undefined,
    clientIp: body.clientIp != null ? String(body.clientIp) : undefined,
  });
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 400 });
  }
  return NextResponse.json(result);
}
