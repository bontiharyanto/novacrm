import { createHash } from 'crypto';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { createInboundTicket } from '@/lib/tickets/actions';
import { classifyInbound } from '@/lib/inbound/classify';
import { matchInboundCatalog } from '@/lib/inbound/catalog-match';
import { evaluateWorkflow } from '@/lib/workflows/actions';
import { displayTicketNumber } from '@/lib/tickets/process';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

export type InboundChannel = 'whatsapp' | 'telegram' | 'email' | 'alert' | 'generic';

export type IngestInput = {
  tenantId: string;
  channel: InboundChannel;
  title: string;
  body: string;
  sender?: string;
  senderPhone?: string;
  senderEmail?: string;
  chatId?: string;
  fingerprint?: string;
  priority?: TicketPriority;
  type?: TicketType;
  assetTag?: string;
  payload?: unknown;
  resolved?: boolean;
};

function fingerprintOf(input: IngestInput) {
  if (input.fingerprint?.trim()) return input.fingerprint.trim().slice(0, 180);
  const raw = [input.channel, input.sender ?? '', input.senderPhone ?? '', input.title]
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return createHash('sha1').update(raw).digest('hex');
}

function categoryOf(channel: InboundChannel) {
  if (channel === 'alert') return 'monitoring';
  return channel;
}

function extraEvent(channel: InboundChannel) {
  return channel === 'alert' ? 'alert.received' : 'inbound.message';
}

export function mapAlertSeverity(value?: string): TicketPriority {
  const v = (value ?? '').toLowerCase();
  if (['critical', 'fatal', 'page', 'p1', 'sev1'].includes(v)) return 'critical';
  if (['high', 'error', 'major', 'p2', 'sev2'].includes(v)) return 'high';
  if (['warning', 'warn', 'p3', 'sev3'].includes(v)) return 'medium';
  if (['info', 'low', 'p4', 'sev4'].includes(v)) return 'low';
  return 'high';
}

export async function ingestInbound(input: IngestInput) {
  if (!hasServiceRole()) {
    return { data: null, error: 'Service role is required for inbound tickets' };
  }

  const supabase = createSupabaseAdminClient();
  const fingerprint = fingerprintOf(input);
  const titleRaw = input.title.trim().slice(0, 200);
  const title = titleRaw.length >= 3 ? titleRaw : `${titleRaw || input.channel} ticket`;
  const body = input.body.trim().slice(0, 5000) || title;

  const { data: recent } = await supabase
    .from('inbound_events')
    .select('id, ticket_id')
    .eq('tenant_id', input.tenantId)
    .eq('fingerprint', fingerprint)
    .not('ticket_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.ticket_id) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, number, title, status, tenant_id')
      .eq('id', recent.ticket_id)
      .maybeSingle();
    if (ticket && !['resolved', 'closed'].includes(ticket.status)) {
      const note = input.resolved
        ? `Alert recovered.\n\n${body}`
        : `Repeat ${input.channel} message.\n\n${body}`;
      await supabase.from('ticket_comments').insert({
        tenant_id: input.tenantId,
        ticket_id: ticket.id,
        message: note,
      });
      await supabase.from('inbound_events').insert({
        tenant_id: input.tenantId,
        ticket_id: ticket.id,
        channel: input.channel,
        fingerprint,
        sender: input.sender ?? input.senderPhone ?? input.senderEmail ?? input.chatId,
        subject: title,
        body,
        payload: input.payload ?? {},
        status: 'correlated',
      });
      return {
        data: {
          ticketId: ticket.id,
          number: ticket.number,
          title: ticket.title,
          correlated: true,
          message: `Ticket ${displayTicketNumber(ticket.number, ticket.id)} updated`,
        },
        error: null,
      };
    }
  }

  let assetId: string | undefined;
  if (input.assetTag) {
    const tag = input.assetTag.trim();
    const { data: asset } = await supabase
      .from('assets')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('asset_tag', tag)
      .maybeSingle();
    assetId = asset?.id;
  }

  const catalog =
    input.channel === 'alert'
      ? null
      : await matchInboundCatalog({ tenantId: input.tenantId, title, body });

  const classified =
    input.channel === 'alert'
      ? {
          type: input.type ?? 'incident',
          priority: input.priority ?? 'high',
          title,
          note: undefined as string | undefined,
        }
      : catalog
        ? {
            type: catalog.ticketType,
            priority: catalog.priority,
            title: catalog.name,
            note: catalog.missing.length > 0 ? `Lengkapi: ${catalog.missing.join(', ')}` : catalog.name,
          }
        : await classifyInbound({
            tenantId: input.tenantId,
            title,
            body,
            fallbackType: input.type ?? 'incident',
            fallbackPriority: input.priority ?? 'medium',
          });

  const description = catalog
    ? [body, catalog.summary ? `Catalog answers\n${catalog.summary}` : '', classified.note ? `— VA: ${classified.note}` : '']
        .filter(Boolean)
        .join('\n\n')
    : classified.note
      ? `${body}\n\n— VA: ${classified.note}`
      : body;

  const result = await createInboundTicket(input.tenantId, {
    tenantId: input.tenantId,
    title: classified.title,
    description,
    type: classified.type,
    status: 'open',
    priority: classified.priority,
    catalogItemId: catalog?.itemId,
    catalogAnswers: catalog?.answers,
    requesterName: input.sender || input.channel,
    requesterEmail: input.senderEmail,
    requesterPhone: input.senderPhone,
    assigneeChatId: input.chatId,
    category: categoryOf(input.channel),
    assetId,
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? 'Unable to create inbound ticket' };
  }

  await supabase.from('inbound_events').insert({
    tenant_id: input.tenantId,
    account_id: result.data.accountId,
    ticket_id: result.data.id,
    channel: input.channel,
    fingerprint,
    sender: input.sender ?? input.senderPhone ?? input.senderEmail ?? input.chatId,
    subject: title,
    body,
    payload: input.payload ?? {},
    status: 'created',
  });

  await evaluateWorkflow(
    extraEvent(input.channel),
    { ticketId: result.data.id, tenantId: input.tenantId, status: result.data.status, category: result.data.category },
    result.data,
  );

  return {
    data: {
      ticketId: result.data.id,
      number: result.data.number,
      title: result.data.title,
      correlated: false,
      message: catalog
        ? `Ticket ${displayTicketNumber(result.data.number, result.data.id)} telah dibuat (${catalog.name}${catalog.missing.length ? `. Lengkapi: ${catalog.missing.join(', ')}` : ''})`
        : `Ticket ${displayTicketNumber(result.data.number, result.data.id)} telah dibuat (${classified.type} · ${classified.priority})`,
    },
    error: null,
  };
}
