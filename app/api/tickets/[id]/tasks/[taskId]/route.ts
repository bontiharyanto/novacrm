import { NextRequest, NextResponse } from 'next/server';
import { deleteTicketTask, updateTicketTask } from '@/lib/tickets/tasks-actions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  const body = await request.json().catch(() => ({}));
  const result = await updateTicketTask(params.id, params.taskId, body);
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error ?? 'Unable to update task' }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; taskId: string } },
) {
  const result = await deleteTicketTask(params.id, params.taskId);
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}
