import { NextRequest, NextResponse } from 'next/server';
import { listRecentAudit } from '@/lib/tickets/audit';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const data = await listRecentAudit(query);
  return NextResponse.json({ data, error: null });
}
