import { NextRequest, NextResponse } from 'next/server';
import { createCmdbItem, listCmdbItems } from '@/lib/cmdb/actions';

export async function GET() {
  const items = await listCmdbItems();
  return NextResponse.json({ data: items, error: null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createCmdbItem(body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create CMDB item' },
      { status: 500 }
    );
  }
}
