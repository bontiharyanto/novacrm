import { processNotificationJob } from '@/lib/queue/notification.worker';
import { getTicketTemplates } from '@/lib/notifications/templates';
import { renderTemplate } from '@/lib/notifications/templates';
import { buildTicketNotificationMessage } from '@/lib/notifications/helpers';

export type TicketEventContext = {
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';
  ticket: {
    id: string;
    title: string;
    status: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    assigneeName?: string;
    assigneeChatId?: string;
    tenantId?: string;
  };
  message?: string;
};

export async function dispatchTicketNotification(context: TicketEventContext) {
  const { event, ticket, message } = context;
  const templates = getTicketTemplates(event);
  renderTemplate(templates.subject ?? 'NovaCRM Ticket Update', {
    id: ticket.id,
    name: ticket.requesterName ?? 'Customer',
    status: ticket.status,
    title: ticket.title,
  });

  const body = renderTemplate(templates.body, {
    id: ticket.id,
    name: ticket.requesterName ?? 'Customer',
    status: ticket.status,
    title: ticket.title,
    message: message ?? '',
  });

  const notificationMessage = buildTicketNotificationMessage(
    {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
    },
    body
  );

  return processNotificationJob({
    tenantId: ticket.tenantId ?? 'demo-tenant',
    event,
    ticketId: ticket.id,
    title: ticket.title,
    status: ticket.status,
    requesterName: ticket.requesterName,
    assigneeName: ticket.assigneeName,
    requesterEmail: ticket.requesterEmail,
    requesterPhone: ticket.requesterPhone,
    assigneeChatId: ticket.assigneeChatId,
    message: notificationMessage,
  });
}
