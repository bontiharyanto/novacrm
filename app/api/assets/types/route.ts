import { NextRequest, NextResponse } from 'next/server';
import { createAssetType, listAssetTypes } from '@/lib/assets/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Asset');
  if (auth.error) return auth.error;
  const items = await listAssetTypes();
  return NextResponse.json({ data: items, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Asset');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await createAssetType(body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to add asset type' },
      { status: 500 },
    );
  }
}
