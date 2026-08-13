import { enqueueNotification } from '@/lib/queue/notification.queue';
import type { NotificationJobPayload } from '@/lib/notifications/types';
import { getTicketTemplates, renderTemplate } from '@/lib/notifications/templates';
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
    body,
  );

  const payload: NotificationJobPayload = {
    tenantId: ticket.tenantId ?? '',
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
  };

  return enqueueNotification(payload);
}
