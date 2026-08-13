import { NextRequest, NextResponse } from 'next/server';
import { createTicket, listTickets } from '@/lib/tickets/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const tickets = await listTickets();
  return NextResponse.json({ data: tickets, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await createTicket(body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create ticket' },
      { status: 500 },
    );
  }
}
