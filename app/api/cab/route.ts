import { NextResponse } from 'next/server';
import { listChanges } from '@/lib/cab/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const changes = await listChanges();
  return NextResponse.json({ data: changes, error: null });
}
