import { NextResponse } from 'next/server';
import { getQueueCounts } from '@/lib/tickets/queue-counts';
import { requireApiUser } from '@/lib/api/require-user';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;
    if (!(await canAccessConfiguredCapability('read', 'OperationsServiceDesk'))) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }
    const data = await getQueueCounts();
    return NextResponse.json({ data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to load queue counts' },
      { status: 500 },
    );
  }
}
