import { NextRequest, NextResponse } from 'next/server';
import { createTicketTask, listTicketTasks } from '@/lib/tickets/tasks-actions';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const result = await listTicketTasks(params.id);
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 400 });
  }
  return NextResponse.json({
    data: result.data,
    sequential: result.sequential,
    error: null,
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await createTicketTask(params.id, body);
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error ?? 'Unable to create task' }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}
