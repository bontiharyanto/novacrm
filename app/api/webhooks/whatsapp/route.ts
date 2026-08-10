import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/tickets/actions';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const message = payload?.message ?? payload?.text ?? payload?.body ?? '';
    const sender = payload?.sender ?? payload?.from ?? payload?.phone ?? 'customer';
    const senderPhone = payload?.senderPhone ?? payload?.phone ?? payload?.from ?? 'unknown';

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ data: null, error: 'Invalid WhatsApp payload' }, { status: 400 });
    }

    const title = message
      .replace(/^ticket\s*:\s*/i, '')
      .replace(/^halo\s+/i, '')
      .trim() || 'Laptop Rusak';

    const result = await createTicket({
      tenantId: 'demo-tenant',
      title,
      description: `Inbound WhatsApp message: ${message}`,
      requesterName: typeof sender === 'string' ? sender : 'Customer',
      requesterPhone: typeof senderPhone === 'string' ? senderPhone : undefined,
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
        sender,
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
