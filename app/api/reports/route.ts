import { NextRequest, NextResponse } from 'next/server';
import { getReportSnapshot } from '@/lib/reports/actions';
import { requireApiUser } from '@/lib/api/require-user';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  if (!(await canAccessConfiguredCapability('read', 'OperationsReports'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const data = await getReportSnapshot({
    range: request.nextUrl.searchParams.get('range'),
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
  });
  return NextResponse.json({ data, error: data ? null : 'Unable to load report' });
}
