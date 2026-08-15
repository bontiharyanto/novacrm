import { NextRequest, NextResponse } from 'next/server';
import { listPublicSsoOptions } from '@/lib/auth/sso';

export async function GET(request: NextRequest) {
  const tenant = request.nextUrl.searchParams.get('tenant');
  const data = await listPublicSsoOptions(tenant);
  return NextResponse.json({ data, error: null });
}
