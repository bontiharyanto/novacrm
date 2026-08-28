import { NextRequest, NextResponse } from 'next/server';
import { getChangeRecord, saveChangePlan, submitChangeToCab } from '@/lib/cab/actions';
import { requireApiUser } from '@/lib/api/require-user';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  if (!(await canAccessConfiguredCapability('read', 'OperationsCab'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const record = await getChangeRecord(params.id);
  if (!record.ticket) {
    return NextResponse.json({ data: null, error: 'Change not found' }, { status: 404 });
  }
  return NextResponse.json({ data: record, error: null });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  if (!(await canAccessConfiguredCapability('update', 'OperationsCab'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (body.submit === true) {
      const result = await submitChangeToCab(params.id);
      if (result.error) {
        return NextResponse.json({ data: null, error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }
    const result = await saveChangePlan(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update change' },
      { status: 500 },
    );
  }
}
