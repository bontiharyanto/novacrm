import { NextRequest, NextResponse } from 'next/server';
import { getCmdbById, updateCmdbItem } from '@/lib/cmdb/actions';
import { getCmdbImpact } from '@/lib/cmdb/impact';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Cmdb');
  if (auth.error) return auth.error;

  const item = await getCmdbById(params.id);
  if (!item) {
    return NextResponse.json({ data: null, error: 'CI not found' }, { status: 404 });
  }

  const impact = await getCmdbImpact(params.id);
  return NextResponse.json({ data: { ...item, impact }, error: null });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Cmdb');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await updateCmdbItem(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update CI' },
      { status: 500 },
    );
  }
}
