import { NextRequest, NextResponse } from 'next/server';
import { runAssistant } from '@/lib/assistant/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const threadId = typeof body.threadId === 'string' ? body.threadId : null;
    const locale = body.locale === 'en' || body.locale === 'id' ? body.locale : undefined;
    const result = await runAssistant(messages, threadId, locale);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Assistant failed' },
      { status: 500 },
    );
  }
}
