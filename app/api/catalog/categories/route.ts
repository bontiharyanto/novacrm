import { NextRequest, NextResponse } from 'next/server';
import { createCatalogCategory, listCatalogCategories } from '@/lib/catalog/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const categories = await listCatalogCategories();
  return NextResponse.json({ data: categories, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Catalog');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await createCatalogCategory(body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create category' },
      { status: 500 },
    );
  }
}
