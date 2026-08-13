import { NextRequest, NextResponse } from 'next/server';
import { getDataBreach, updateDataBreach } from '@/lib/governance/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Governance');
  if (auth.error) return auth.error;
  const data = await getDataBreach(params.id);
  return NextResponse.json({ data, error: data ? null : 'Not found' });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Governance');
  if (auth.error) return auth.error;
  try {
    const result = await updateDataBreach(params.id, await request.json());
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 403 : 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update breach' },
      { status: 400 },
    );
  }
}
