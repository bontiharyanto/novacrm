import { NextRequest, NextResponse } from 'next/server';
import { decideCab } from '@/lib/cab/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await decideCab(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to record CAB decision' },
      { status: 500 },
    );
  }
}
