import { NextRequest, NextResponse } from 'next/server';
import { getCatalogVariableSet, updateCatalogVariableSet } from '@/lib/catalog/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Catalog');
  if (auth.error) return auth.error;

  const set = await getCatalogVariableSet(params.id);
  if (!set) {
    return NextResponse.json({ data: null, error: 'Variable set not found' }, { status: 404 });
  }
  return NextResponse.json({ data: set, error: null });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Catalog');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await updateCatalogVariableSet(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update variable set' },
      { status: 500 },
    );
  }
}
