import { NextRequest, NextResponse } from 'next/server';
import { deleteCatalogCategory } from '@/lib/catalog/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('delete', 'Catalog');
  if (auth.error) return auth.error;

  try {
    const result = await deleteCatalogCategory(params.id);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to delete category' },
      { status: 500 },
    );
  }
}
