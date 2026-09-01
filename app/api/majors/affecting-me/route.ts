import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { listMajorsAffectingUser } from '@/lib/tickets/major-impact';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const location = request.nextUrl.searchParams.get('location') ?? undefined;
  const accountId = request.nextUrl.searchParams.get('accountId') ?? undefined;
  const data = await listMajorsAffectingUser(location, accountId);

  return NextResponse.json({ data, error: null });
}
