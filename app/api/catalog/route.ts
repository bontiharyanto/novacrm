import { NextRequest, NextResponse } from 'next/server';
import {
  createCatalogItem,
  listCatalogCategories,
  listCatalogItems,
  listCatalogVariableSets,
} from '@/lib/catalog/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const items = await listCatalogItems();
  const categories = await listCatalogCategories();
  const sets = auth.session.profile.role === 'customer' ? [] : await listCatalogVariableSets();
  return NextResponse.json({ data: items, categories, sets, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Catalog');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await createCatalogItem(body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create catalog item' },
      { status: 500 },
    );
  }
}
