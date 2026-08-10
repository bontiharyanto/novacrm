import { NextRequest, NextResponse } from 'next/server';
import { getTenantConfig, upsertTenantConfig } from '@/lib/tenants/config';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? 'default';
  return NextResponse.json({ data: getTenantConfig(tenantId), error: null });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = upsertTenantConfig(json);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save tenant settings' },
      { status: 500 }
    );
  }
}
