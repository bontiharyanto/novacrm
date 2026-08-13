import { NextRequest, NextResponse } from 'next/server';
import { getTenantConfig, upsertTenantConfig } from '@/lib/tenants/config';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Tenant');
  if (auth.error) return auth.error;

  const data = await getTenantConfig(auth.session.profile.tenantId);
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'Tenant');
  if (auth.error) return auth.error;

  try {
    const json = await request.json();
    const result = await upsertTenantConfig(json);
    if ('error' in result && result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save tenant settings' },
      { status: 500 },
    );
  }
}
