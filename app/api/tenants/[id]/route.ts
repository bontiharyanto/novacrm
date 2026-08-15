import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { getTenantById, updateTenant } from '@/lib/tenants/actions';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Tenant');
  if (auth.error) return auth.error;

  const data = await getTenantById(params.id);
  if (!data) {
    return NextResponse.json({ data: null, error: 'Tenant not found' }, { status: 404 });
  }
  return NextResponse.json({ data, error: null });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Tenant');
  if (auth.error) return auth.error;

  try {
    const json = await request.json();
    const result = await updateTenant(params.id, json);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update tenant' },
      { status: 500 },
    );
  }
}
