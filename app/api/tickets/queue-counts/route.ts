import { NextResponse } from 'next/server';
import { getQueueCounts } from '@/lib/tickets/queue-counts';

export async function GET() {
  try {
    const data = await getQueueCounts();
    return NextResponse.json({ data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to load queue counts' },
      { status: 500 },
    );
  }
}
