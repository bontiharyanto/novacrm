import { NextRequest, NextResponse } from 'next/server';
import { createTaskActivity, listTaskActivities } from '@/lib/tickets/task-activities-actions';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  const result = await listTaskActivities(params.id, params.taskId);
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  const result = await createTaskActivity(params.id, params.taskId, await request.json().catch(() => null));
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error ?? 'Unable to create activity' }, { status: result.error === 'Unauthorized' ? 401 : 400 });
  }
  return NextResponse.json({ data: result.data, error: null }, { status: 201 });
}
