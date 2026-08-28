import { NextRequest, NextResponse } from 'next/server';
import { listRecentAudit } from '@/lib/tickets/audit';
import { requireApiUser } from '@/lib/api/require-user';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  if (!(await canAccessConfiguredCapability('read', 'OperationsAudit'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const data = await listRecentAudit(query);
  return NextResponse.json({ data, error: null });
}
