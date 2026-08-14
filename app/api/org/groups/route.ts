import { NextRequest, NextResponse } from 'next/server';
import { listAssignmentGroups } from '@/lib/org/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Org');
  if (auth.error) return auth.error;
  const groups = await listAssignmentGroups(request.nextUrl.searchParams.get('accountId'));
  return NextResponse.json({ data: groups, error: null });
}
