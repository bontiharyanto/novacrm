import { NextResponse } from 'next/server';
import { summarizeTicket } from '@/lib/tickets/summary';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  const result = await summarizeTicket(params.id);
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
