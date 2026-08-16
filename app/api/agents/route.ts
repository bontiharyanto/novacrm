import { NextResponse } from 'next/server';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: Request) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const groupId = params.get('groupId') ?? undefined;
  const accountId = params.get('accountId') ?? undefined;
  const agents = await listAssignableAgents(groupId || undefined, accountId || undefined);
  return NextResponse.json({ data: agents, error: null });
}
