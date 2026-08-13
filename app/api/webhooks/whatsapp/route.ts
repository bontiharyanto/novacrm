import { NextRequest, NextResponse } from 'next/server';
import { createInboundTicket } from '@/lib/tickets/actions';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { verifyWebhookSecret } from '@/lib/webhooks/verify';
import { DEMO_TENANT_ID } from '@/lib/config/constants';

export async function POST(request: NextRequest) {
  const provided =
    request.headers.get('x-webhook-secret') ??
    request.headers.get('x-hub-signature-256') ??
    request.nextUrl.searchParams.get('secret');

  if (!verifyWebhookSecret(provided, process.env.WHATSAPP_WEBHOOK_SECRET)) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const message = payload?.message ?? payload?.text ?? payload?.body ?? '';
    const sender = payload?.sender ?? payload?.from ?? payload?.phone ?? 'customer';
    const senderPhone = payload?.senderPhone ?? payload?.phone ?? payload?.from ?? 'unknown';

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ data: null, error: 'Invalid WhatsApp payload' }, { status: 400 });
    }

    const title =
      message.replace(/^ticket\s*:\s*/i, '').replace(/^halo\s+/i, '').trim() || 'Laptop Rusak';

    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const result = await createInboundTicket(tenantId, {
      tenantId,
      title,
      description: `Inbound WhatsApp message: ${message}`,
      requesterName: typeof sender === 'string' ? sender : 'Customer',
      requesterPhone: typeof senderPhone === 'string' ? senderPhone : undefined,
      status: 'open',
      priority: 'medium',
    });

    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    const reply = `Ticket #${result.data.id.slice(0, 8)} telah dibuat`;
    if (typeof senderPhone === 'string' && senderPhone !== 'unknown') {
      await sendWhatsApp(senderPhone, reply);
    }

    return NextResponse.json({
      data: {
        ticketId: result.data.id,
        title: result.data.title,
        status: result.data.status,
        message: reply,
        sender,
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
