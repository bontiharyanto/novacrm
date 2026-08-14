import { NextRequest, NextResponse } from 'next/server';
import { ingestInbound } from '@/lib/inbound/ingest';
import { sendTelegram } from '@/lib/integrations/telegram';
import { verifyWebhookSecret, webhookSecretFromHeaders } from '@/lib/webhooks/verify';
import { DEMO_TENANT_ID } from '@/lib/config/constants';

export async function POST(request: NextRequest) {
  const provided = webhookSecretFromHeaders(request, ['x-telegram-bot-api-secret-token']);

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

    const title = text.replace(/^ticket\s*:\s*/i, '').replace(/^halo\s+/i, '').trim() || 'Telegram request';
    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const result = await ingestInbound({
      tenantId,
      channel: 'telegram',
      title,
      body: text,
      sender: typeof sender === 'string' ? sender : 'Customer',
      chatId: chatId != null ? String(chatId) : undefined,
      payload,
    });

    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    if (chatId && chatId !== 'unknown') {
      await sendTelegram(String(chatId), result.data.message);
    }

    return NextResponse.json({ data: { ...result.data, chatId }, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
