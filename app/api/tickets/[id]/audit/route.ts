import { NextResponse } from 'next/server';
import { listTicketAudit } from '@/lib/tickets/audit';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const data = await listTicketAudit(params.id);
  return NextResponse.json({ data, error: null });
}
