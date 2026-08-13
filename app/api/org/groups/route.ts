import { NextResponse } from 'next/server';
import { listAssignmentGroups } from '@/lib/org/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Org');
  if (auth.error) return auth.error;
  const groups = await listAssignmentGroups();
  return NextResponse.json({ data: groups, error: null });
}
