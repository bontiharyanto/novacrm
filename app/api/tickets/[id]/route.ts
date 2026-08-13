import { NextRequest, NextResponse } from 'next/server';
import { addTicketComment, getTicketById, updateTicketStatus } from '@/lib/tickets/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const ticket = await getTicketById(params.id);
  return NextResponse.json({ data: ticket, error: ticket ? null : 'Ticket not found' });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await updateTicketStatus(params.id, body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update ticket' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await addTicketComment(params.id, body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to add comment' },
      { status: 500 },
    );
  }
}
