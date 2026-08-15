import { enqueueNotification } from '@/lib/queue/notification.queue';
import type { NotificationJobPayload } from '@/lib/notifications/types';
import { getTicketTemplates, renderTemplate } from '@/lib/notifications/templates';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { isTicketType, ticketTypeMeta } from '@/lib/tickets/process';

export type TicketEventContext = {
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';
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
    assigneeChatId?: string;
    tenantId?: string;
  };
  message?: string;
};

async function resolveAssigneeEmail(ticket: TicketEventContext['ticket']) {
  if (ticket.assigneeEmail) return ticket.assigneeEmail;
  if (!ticket.assigneeId || !hasServiceRole()) return undefined;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from('profiles').select('email').eq('id', ticket.assigneeId).maybeSingle();
  return data?.email ?? undefined;
}

export async function dispatchTicketNotification(context: TicketEventContext) {
  const { event, ticket, message } = context;
  const templates = getTicketTemplates(event);
  const number = ticket.number || ticket.id.slice(0, 8);
  const typeLabel = isTicketType(ticket.type) ? ticketTypeMeta[ticket.type].label : ticket.type ?? 'Ticket';
  const assigneeEmail = await resolveAssigneeEmail(ticket);

  const body = renderTemplate(templates.body, {
    id: ticket.id,
    number,
    name: ticket.requesterName ?? 'Customer',
    status: ticket.status,
    title: ticket.title,
    type: typeLabel,
    message: message ?? '',
    csat:
      ticket.status === 'resolved' || ticket.status === 'closed'
        ? ' Rate the ticket from the portal after you confirm the fix.'
        : '',
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
    assigneeChatId: ticket.assigneeChatId,
    message: body,
  };

  return enqueueNotification(payload);
}
