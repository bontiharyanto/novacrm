import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/tickets/actions';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const text = payload?.message?.text ?? payload?.text ?? '';
    const chatId = payload?.message?.chat?.id ?? payload?.chat_id ?? 'unknown';
    const sender = payload?.message?.from?.first_name ?? payload?.from?.first_name ?? 'customer';

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ data: null, error: 'Invalid Telegram payload' }, { status: 400 });
    }

    const title = text
      .replace(/^ticket\s*:\s*/i, '')
      .replace(/^halo\s+/i, '')
      .trim() || 'Laptop Rusak';

    const result = await createTicket({
      tenantId: 'demo-tenant',
      title,
      description: `Inbound Telegram message: ${text}`,
      requesterName: typeof sender === 'string' ? sender : 'Customer',
      assigneeChatId: typeof chatId === 'string' ? chatId : undefined,
      status: 'open',
      priority: 'medium',
    });

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        ticketId: result.data.id,
        title: result.data.title,
        status: result.data.status,
        message: `Ticket #${result.data.id} telah dibuat`,
        chatId,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
