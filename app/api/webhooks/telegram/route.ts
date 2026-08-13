import { NextRequest, NextResponse } from 'next/server';
import { createInboundTicket } from '@/lib/tickets/actions';
import { sendTelegram } from '@/lib/integrations/telegram';
import { verifyWebhookSecret } from '@/lib/webhooks/verify';
import { DEMO_TENANT_ID } from '@/lib/config/constants';

export async function POST(request: NextRequest) {
  const provided =
    request.headers.get('x-telegram-bot-api-secret-token') ??
    request.headers.get('x-webhook-secret') ??
    request.nextUrl.searchParams.get('secret');

  if (!verifyWebhookSecret(provided, process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const text = payload?.message?.text ?? payload?.text ?? '';
    const chatId = payload?.message?.chat?.id ?? payload?.chat_id ?? 'unknown';
    const sender = payload?.message?.from?.first_name ?? payload?.from?.first_name ?? 'customer';

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ data: null, error: 'Invalid Telegram payload' }, { status: 400 });
    }

    const title = text.replace(/^ticket\s*:\s*/i, '').replace(/^halo\s+/i, '').trim() || 'Laptop Rusak';
    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const result = await createInboundTicket(tenantId, {
      tenantId,
      title,
      description: `Inbound Telegram message: ${text}`,
      requesterName: typeof sender === 'string' ? sender : 'Customer',
      assigneeChatId: chatId != null ? String(chatId) : undefined,
      status: 'open',
      priority: 'medium',
    });

    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    const reply = `Ticket #${result.data.id.slice(0, 8)} telah dibuat`;
    if (chatId && chatId !== 'unknown') {
      await sendTelegram(String(chatId), reply);
    }

    return NextResponse.json({
      data: {
        ticketId: result.data.id,
        title: result.data.title,
        status: result.data.status,
        message: reply,
        chatId,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
