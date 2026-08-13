import { NextRequest, NextResponse } from 'next/server';
import { submitCatalogRequest } from '@/lib/catalog/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('create', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await submitCatalogRequest(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to submit request' },
      { status: 500 },
    );
  }
}
