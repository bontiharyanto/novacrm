import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { createTenant, listTenants } from '@/lib/tenants/actions';

export async function GET() {
  const auth = await requireApiUser('read', 'Tenant');
  if (auth.error) return auth.error;

  const data = await listTenants();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Tenant');
  if (auth.error) return auth.error;

  try {
    const json = await request.json();
    const result = await createTenant(json);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create tenant' },
      { status: 500 },
    );
  }
}
