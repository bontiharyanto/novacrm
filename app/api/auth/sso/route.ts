import { NextResponse } from 'next/server';
import { listPublicSsoOptions } from '@/lib/auth/sso';

export async function GET() {
  const data = await listPublicSsoOptions();
  return NextResponse.json({ data, error: null });
}
