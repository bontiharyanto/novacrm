import { NextRequest, NextResponse } from 'next/server';
import { createTicket, listTickets } from '@/lib/tickets/actions';

export async function GET() {
  const tickets = await listTickets();
  return NextResponse.json({ data: tickets, error: null });
}

export async function POST(request: NextRequest) {
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
      { status: 500 }
    );
  }
}
