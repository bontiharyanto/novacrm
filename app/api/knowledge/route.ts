import { NextRequest, NextResponse } from 'next/server';
import { listKnowledgeArticles, publishKnowledgeFromTicket } from '@/lib/knowledge/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Knowledge');
  if (auth.error) return auth.error;

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const data = await listKnowledgeArticles(query);
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Knowledge');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
    if (!ticketId) {
      return NextResponse.json({ data: null, error: 'ticketId is required' }, { status: 400 });
    }
    const result = await publishKnowledgeFromTicket(ticketId, body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to publish article' },
      { status: 500 },
    );
  }
}
