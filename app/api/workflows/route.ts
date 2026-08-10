import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowRule, listWorkflowRules } from '@/lib/workflows/automation';

export async function GET() {
  const rules = await listWorkflowRules();
  return NextResponse.json({ data: rules, error: null });
}

export async function POST(request: NextRequest) {
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
      { status: 500 }
    );
  }
}
