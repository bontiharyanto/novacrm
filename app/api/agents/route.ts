import { NextResponse } from 'next/server';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  const agents = await listAssignableAgents();
  return NextResponse.json({ data: agents, error: null });
}
