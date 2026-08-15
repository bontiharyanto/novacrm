import { enqueueNotification } from '@/lib/queue/notification.queue';
import { notifyTicketInbox } from '@/lib/notifications/inbox';
import type { NotificationJobPayload } from '@/lib/notifications/types';
import { getTicketTemplates, renderTemplate } from '@/lib/notifications/templates';
import { getMergedNotificationCopy } from '@/lib/notifications/copy-load';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { portalPermalink, ticketPermalink } from '@/lib/notifications/email-template';
import { loadTenantPublicUrl } from '@/lib/notifications/public-url';
import { resolveNotificationLocale } from '@/lib/notifications/locale';
import { dictionaryFor, localizedStage, localizedType } from '@/lib/i18n/labels';
import type { TicketStatus } from '@/lib/tickets/schema';

export type TicketEventContext = {
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign';
  ticket: {
    id: string;
    number?: string;
    type?: string;
    title: string;
    status: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    assigneePhone?: string;
    assigneeChatId?: string;
    tenantId?: string;
  };
  message?: string;
  locale?: string | null;
};

async function resolveAssigneeContact(ticket: TicketEventContext['ticket']) {
  if (
    (ticket.assigneeEmail && ticket.assigneeChatId && ticket.assigneePhone) ||
    !ticket.assigneeId ||
    !hasServiceRole()
  ) {
    return { email: ticket.assigneeEmail, chatId: ticket.assigneeChatId, phone: ticket.assigneePhone };
  }
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('email, phone, telegram_chat_id')
    .eq('id', ticket.assigneeId)
    .maybeSingle();
  return {
    email: ticket.assigneeEmail || data?.email || undefined,
    chatId: ticket.assigneeChatId || data?.telegram_chat_id || undefined,
    phone: ticket.assigneePhone || data?.phone || undefined,
  };
}

export async function dispatchTicketNotification(context: TicketEventContext) {
  const { event, ticket, message } = context;
  const locale = resolveNotificationLocale(context.locale);
  const t = dictionaryFor(locale);
  const copy = await getMergedNotificationCopy(ticket.tenantId, locale);
  const templates = getTicketTemplates(event, locale, copy, ticket.type);
  const number = ticket.number || ticket.id.slice(0, 8);
  const typeLabel = localizedType(t, ticket.type);
  const statusLabel = localizedStage(t, ticket.type, ticket.status as TicketStatus);
  const assignee = await resolveAssigneeContact(ticket);
  const assigneeEmail = assignee.email;
  const assigneeChatId = assignee.chatId;
  const assigneePhone = assignee.phone;
  const publicUrl = await loadTenantPublicUrl(ticket.tenantId);
  const detailUrl =
    event === 'ticket.assign'
      ? ticketPermalink(ticket.id, publicUrl)
      : portalPermalink(ticket.id, publicUrl);
  const csat =
    ticket.status === 'resolved' || ticket.status === 'closed'
      ? renderTemplate(copy.csat, { url: detailUrl })
      : '';

  const body = renderTemplate(templates.body, {
    id: ticket.id,
    number,
    name: ticket.requesterName ?? 'Customer',
    status: statusLabel,
    title: ticket.title,
    type: typeLabel,
    message: message ?? '',
    csat,
    url: detailUrl,
  });

  const payload: NotificationJobPayload = {
    tenantId: ticket.tenantId ?? '',
    event,
    ticketId: ticket.id,
    number,
    type: ticket.type,
    title: ticket.title,
    status: ticket.status,
    requesterName: ticket.requesterName,
    assigneeName: ticket.assigneeName,
    assigneeId: ticket.assigneeId,
    requesterEmail: ticket.requesterEmail,
    assigneeEmail,
    requesterPhone: ticket.requesterPhone,
    assigneePhone,
    assigneeChatId,
    message: body,
    locale,
  };

  return enqueueNotification(payload);
}

export async function notifyTicketAssigned(tenantId: string, ticketId: string) {
  if (!hasServiceRole()) return { ok: false, error: 'Service role required' };
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('tickets')
    .select('id, number, type, title, status, requester_name, requester_email, requester_phone, assignee_id, assignee_name, assignee_chat_id, tenant_id')
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data?.assignee_id) return { ok: true, skipped: true };
  await notifyTicketInbox({
    event: 'ticket.assign',
    tenantId,
    ticket: {
      id: data.id,
      number: data.number ?? undefined,
      title: data.title,
      status: data.status,
      assigneeId: data.assignee_id,
    },
  });
  return dispatchTicketNotification({
    event: 'ticket.assign',
    ticket: {
      id: data.id,
      number: data.number ?? undefined,
      type: data.type ?? undefined,
      title: data.title,
      status: data.status,
      requesterName: data.requester_name ?? undefined,
      requesterEmail: data.requester_email ?? undefined,
      requesterPhone: data.requester_phone ?? undefined,
      assigneeId: data.assignee_id,
      assigneeName: data.assignee_name ?? undefined,
      assigneeChatId: data.assignee_chat_id ?? undefined,
      tenantId: data.tenant_id,
    },
  });
}
