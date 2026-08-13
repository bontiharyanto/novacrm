import { NextRequest, NextResponse } from 'next/server';
import { getReportSnapshot } from '@/lib/reports/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const data = await getReportSnapshot({
    range: request.nextUrl.searchParams.get('range'),
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
  });
  return NextResponse.json({ data, error: data ? null : 'Unable to load report' });
}
