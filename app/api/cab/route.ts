import { NextResponse } from 'next/server';
import { listChanges } from '@/lib/cab/actions';
import { requireApiUser } from '@/lib/api/require-user';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  if (!(await canAccessConfiguredCapability('read', 'OperationsCab'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const changes = await listChanges();
  return NextResponse.json({ data: changes, error: null });
}
