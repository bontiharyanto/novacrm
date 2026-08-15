import { NextRequest, NextResponse } from 'next/server';
import { listProblemOptions } from '@/lib/tickets/summary';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const accountId = request.nextUrl.searchParams.get('accountId') ?? undefined;
  const data = await listProblemOptions(accountId);
  return NextResponse.json({ data, error: null });
}
