import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowRule, listWorkflowRules } from '@/lib/workflows/automation';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Workflow');
  if (auth.error) return auth.error;

  const rules = await listWorkflowRules();
  return NextResponse.json({ data: rules, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Workflow');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = await createWorkflowRule(body);

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create workflow rule' },
      { status: 500 },
    );
  }
}
