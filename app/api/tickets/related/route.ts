import { NextRequest, NextResponse } from 'next/server';
import { listMajorChildOptions, listMajorParentOptions } from '@/lib/tickets/summary';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const accountId = request.nextUrl.searchParams.get('accountId') ?? undefined;
  const excludeId = request.nextUrl.searchParams.get('excludeId') ?? undefined;
  const kind = request.nextUrl.searchParams.get('kind') ?? 'parents';

  const data =
    kind === 'children'
      ? await listMajorChildOptions(accountId, excludeId)
      : await listMajorParentOptions(accountId, excludeId);

  return NextResponse.json({ data, error: null });
}
