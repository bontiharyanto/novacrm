import { NextRequest, NextResponse } from 'next/server';
import { createAsset, listAssets } from '@/lib/assets/actions';

export async function GET() {
  const assets = await listAssets();
  return NextResponse.json({ data: assets, error: null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createAsset(body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create asset' },
      { status: 500 }
    );
  }
}
