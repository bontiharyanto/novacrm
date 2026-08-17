import { NextRequest, NextResponse } from 'next/server';
import { ingestInbound, mapAlertSeverity } from '@/lib/inbound/ingest';
import { sendTelegram } from '@/lib/integrations/telegram';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { isTenantBackendBlocked, loadTenantBySlug } from '@/lib/tenants/resolve-slug';
import type { TenantWebhookChannel } from '@/lib/tenants/backend-url';
import { verifyInboundSecret } from '@/lib/webhooks/inbound';
import { webhookSecretFromHeaders } from '@/lib/webhooks/verify';
import type { TicketPriority } from '@/lib/tickets/schema';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function envSecret(channel: TenantWebhookChannel) {
  if (channel === 'whatsapp') return process.env.WHATSAPP_WEBHOOK_SECRET;
  if (channel === 'telegram') return process.env.TELEGRAM_WEBHOOK_SECRET;
  if (channel === 'email') return process.env.EMAIL_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET;
  if (channel === 'alerts') return process.env.ALERT_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET;
  return process.env.WEBHOOK_SECRET ?? process.env.ALERT_WEBHOOK_SECRET;
}

function dbKind(channel: TenantWebhookChannel) {
  if (channel === 'alerts') return 'alert' as const;
  return channel;
}

function extraHeaders(channel: TenantWebhookChannel) {
  if (channel === 'whatsapp') return ['x-hub-signature-256'];
  if (channel === 'telegram') return ['x-telegram-bot-api-secret-token'];
  if (channel === 'email') return ['svix-signature'];
  return [];
}

export async function handleTenantWebhook(request: NextRequest, slug: string, channel: TenantWebhookChannel) {
  const tenant = await loadTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ data: null, error: 'Tenant not found' }, { status: 404 });
  }
  if (isTenantBackendBlocked(tenant)) {
    return NextResponse.json({ data: null, error: 'Tenant is paused or expired' }, { status: 403 });
  }

  const provided = webhookSecretFromHeaders(request, extraHeaders(channel));
  if (!(await verifyInboundSecret(provided, envSecret(channel), dbKind(channel), tenant.id))) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    if (channel === 'whatsapp') return handleWhatsApp(tenant.id, payload);
    if (channel === 'telegram') return handleTelegram(tenant.id, payload);
    if (channel === 'email') return handleEmail(tenant.id, payload);
    if (channel === 'alerts') return handleAlerts(tenant.id, payload);
    return handleGeneric(tenant.id, payload);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 },
    );
  }
}

async function handleGeneric(tenantId: string, payload: unknown) {
  const root = asRecord(payload);
  const title = String(root.title ?? root.subject ?? root.alert ?? 'Inbound event');
  const body = String(root.body ?? root.message ?? root.description ?? title);
  const result = await ingestInbound({
    tenantId,
    channel: 'generic',
    title,
    body,
    sender: String(root.sender ?? root.from ?? 'integration'),
    senderEmail: typeof root.email === 'string' ? root.email : undefined,
    senderPhone: typeof root.phone === 'string' ? root.phone : undefined,
    fingerprint: typeof root.fingerprint === 'string' ? root.fingerprint : undefined,
    priority: root.priority ? mapAlertSeverity(String(root.priority)) : ('medium' as TicketPriority),
    assetTag: typeof root.assetTag === 'string' ? root.assetTag : undefined,
    payload: root,
  });
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}

async function handleWhatsApp(tenantId: string, payload: unknown) {
  const root = asRecord(payload);
  const message = root.message ?? root.text ?? root.body ?? '';
  const sender = root.sender ?? root.from ?? root.phone ?? 'customer';
  const senderPhone = root.senderPhone ?? root.phone ?? root.from ?? 'unknown';
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ data: null, error: 'Invalid WhatsApp payload' }, { status: 400 });
  }
  const title = message.replace(/^ticket\s*:\s*/i, '').replace(/^halo\s+/i, '').trim() || 'WhatsApp request';
  const result = await ingestInbound({
    tenantId,
    channel: 'whatsapp',
    title,
    body: message,
    sender: typeof sender === 'string' ? sender : 'Customer',
    senderPhone: typeof senderPhone === 'string' ? senderPhone : undefined,
    payload: root,
  });
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  if (typeof senderPhone === 'string' && senderPhone !== 'unknown') {
    await sendWhatsApp(senderPhone, result.data.message);
  }
  return NextResponse.json({ data: { ...result.data, sender }, error: null });
}

async function handleTelegram(tenantId: string, payload: unknown) {
  const root = asRecord(payload);
  const message = asRecord(root.message);
  const from = asRecord(message.from ?? root.from);
  const chat = asRecord(message.chat);
  const text = String(message.text ?? root.text ?? '');
  const chatId = chat.id ?? root.chat_id ?? 'unknown';
  const sender = from.first_name ?? 'customer';
  if (!text) {
    return NextResponse.json({ data: null, error: 'Invalid Telegram payload' }, { status: 400 });
  }
  if (chatId && chatId !== 'unknown' && /^\/(start|chatid)\b/i.test(text.trim())) {
    await sendTelegram(
      String(chatId),
      `Chat ID Anda: ${chatId}\nSimpan di NovaCRM → Security → Telegram supaya assign tiket masuk ke sini.`,
    );
    return NextResponse.json({ data: { chatId, linked: false }, error: null });
  }
  const title = text.replace(/^ticket\s*:\s*/i, '').replace(/^halo\s+/i, '').trim() || 'Telegram request';
  const result = await ingestInbound({
    tenantId,
    channel: 'telegram',
    title,
    body: text,
    sender: typeof sender === 'string' ? sender : 'Customer',
    chatId: chatId != null ? String(chatId) : undefined,
    payload: root,
  });
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  if (chatId && chatId !== 'unknown') {
    await sendTelegram(String(chatId), result.data.message);
  }
  return NextResponse.json({ data: { ...result.data, chatId }, error: null });
}

async function handleEmail(tenantId: string, payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const from = String(data.from ?? root.from ?? root.From ?? 'customer@unknown');
  const subject = String(data.subject ?? root.subject ?? root.Subject ?? '').trim();
  const text = String(data.text ?? data.html ?? root.text ?? root.TextBody ?? root.body ?? '').trim();
  if (!text && !subject) {
    return NextResponse.json({ data: null, error: 'Invalid email payload' }, { status: 400 });
  }
  const result = await ingestInbound({
    tenantId,
    channel: 'email',
    title: subject.replace(/^ticket\s*:\s*/i, '').trim() || 'Email request',
    body: text || subject,
    sender: from.split('<')[0].trim() || 'email',
    senderEmail: from.match(/[^\s<>]+@[^\s<>]+/)?.[0] ?? from,
    fingerprint: `${from}|${subject}`.slice(0, 180),
    payload: root,
  });
  if (result.error || !result.data) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}

async function handleAlerts(tenantId: string, payload: unknown) {
  const root = asRecord(payload);
  const alerts = Array.isArray(root.alerts) ? root.alerts : null;
  const items = alerts
    ? alerts.map((item) => {
        const row = asRecord(item);
        const labels = asRecord(row.labels);
        const annotations = asRecord(row.annotations);
        return {
          title: String(labels.alertname ?? annotations.summary ?? row.alertname ?? 'Machine alert').slice(0, 200),
          body: String(annotations.description ?? annotations.summary ?? row.description ?? JSON.stringify(labels)),
          severity: String(labels.severity ?? labels.priority ?? row.severity ?? ''),
          instance: String(labels.instance ?? labels.host ?? labels.asset_tag ?? ''),
          fingerprint: String(row.fingerprint ?? `${labels.alertname}:${labels.instance}`),
          resolved: row.status === 'resolved',
        };
      })
    : [
        {
          title: String(root.title ?? root.alert ?? root.alertname ?? 'Machine alert'),
          body: String(root.description ?? root.message ?? root.summary ?? root.title ?? 'Machine alert'),
          severity: String(root.severity ?? root.priority ?? ''),
          instance: String(root.instance ?? root.host ?? root.assetTag ?? ''),
          fingerprint: String(root.fingerprint ?? ''),
          resolved: root.status === 'resolved' || root.status === 'ok',
        },
      ];

  const results = [];
  for (const alert of items) {
    const result = await ingestInbound({
      tenantId,
      channel: 'alert',
      title: alert.title,
      body: alert.body,
      sender: 'monitoring',
      fingerprint: alert.fingerprint,
      priority: mapAlertSeverity(alert.severity),
      assetTag: alert.instance || undefined,
      payload: alert,
      resolved: alert.resolved,
    });
    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    results.push(result.data);
  }
  return NextResponse.json({ data: results, error: null });
}
