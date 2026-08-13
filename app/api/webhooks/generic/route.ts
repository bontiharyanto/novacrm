import { NextRequest, NextResponse } from 'next/server';
import { ingestInbound, mapAlertSeverity } from '@/lib/inbound/ingest';
import { verifyInboundSecret } from '@/lib/webhooks/inbound';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import type { TicketPriority } from '@/lib/tickets/schema';

export async function POST(request: NextRequest) {
  const provided =
    request.headers.get('x-webhook-secret') ?? request.nextUrl.searchParams.get('secret');

  if (!(await verifyInboundSecret(provided, process.env.WEBHOOK_SECRET ?? process.env.ALERT_WEBHOOK_SECRET, 'generic'))) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const title = String(payload.title ?? payload.subject ?? payload.alert ?? 'Inbound event');
    const body = String(payload.body ?? payload.message ?? payload.description ?? title);
    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const result = await ingestInbound({
      tenantId,
      channel: 'generic',
      title,
      body,
      sender: String(payload.sender ?? payload.from ?? 'integration'),
      senderEmail: typeof payload.email === 'string' ? payload.email : undefined,
      senderPhone: typeof payload.phone === 'string' ? payload.phone : undefined,
      fingerprint: typeof payload.fingerprint === 'string' ? payload.fingerprint : undefined,
      priority: payload.priority ? mapAlertSeverity(String(payload.priority)) : ('medium' as TicketPriority),
      assetTag: typeof payload.assetTag === 'string' ? payload.assetTag : undefined,
      payload,
    });
    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 },
    );
  }
}
