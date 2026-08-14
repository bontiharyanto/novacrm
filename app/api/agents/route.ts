import { NextResponse } from 'next/server';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: Request) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;
  const groupId = new URL(request.url).searchParams.get('groupId') ?? undefined;
  const agents = await listAssignableAgents(groupId || undefined);
  return NextResponse.json({ data: agents, error: null });
}
