import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowById, listWorkflowRuns, updateWorkflowRule } from '@/lib/workflows/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('read', 'Workflow');
  if (auth.error) return auth.error;

  const rule = await getWorkflowById(params.id);
  if (!rule) {
    return NextResponse.json({ data: null, error: 'Workflow not found' }, { status: 404 });
  }
  const runs = await listWorkflowRuns(params.id);
  return NextResponse.json({ data: { ...rule, runs }, error: null });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Workflow');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await updateWorkflowRule(params.id, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update workflow' },
      { status: 500 },
    );
  }
}
