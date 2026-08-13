import { NextRequest, NextResponse } from 'next/server';
import { ingestInbound } from '@/lib/inbound/ingest';
import { verifyInboundSecret } from '@/lib/webhooks/inbound';
import { DEMO_TENANT_ID } from '@/lib/config/constants';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export async function POST(request: NextRequest) {
  const provided =
    request.headers.get('x-webhook-secret') ??
    request.headers.get('svix-signature') ??
    request.nextUrl.searchParams.get('secret');

  if (!(await verifyInboundSecret(provided, process.env.EMAIL_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET, 'email'))) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const root = asRecord(payload);
    const data = asRecord(root.data);
    const from = String(data.from ?? root.from ?? root.From ?? 'customer@unknown');
    const subject = String(data.subject ?? root.subject ?? root.Subject ?? '').trim();
    const text = String(data.text ?? data.html ?? root.text ?? root.TextBody ?? root.body ?? '').trim();
    const title = subject.replace(/^ticket\s*:\s*/i, '').trim() || 'Email request';

    if (!text && !subject) {
      return NextResponse.json({ data: null, error: 'Invalid email payload' }, { status: 400 });
    }

    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const result = await ingestInbound({
      tenantId,
      channel: 'email',
      title,
      body: text || subject,
      sender: from.split('<')[0].trim() || 'email',
      senderEmail: from.match(/[^\s<>]+@[^\s<>]+/)?.[0] ?? from,
      fingerprint: `${from}|${subject}`.slice(0, 180),
      payload,
    });

    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Email webhook failed' },
      { status: 500 },
    );
  }
}
