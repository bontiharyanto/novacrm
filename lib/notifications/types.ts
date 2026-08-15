export type NotificationChannelType = 'whatsapp' | 'telegram' | 'email';

export type NotificationChannelConfig = {
  apiKey?: string;
  botToken?: string;
  from?: string;
  chatId?: string;
  target?: string;
  baseUrl?: string;
  enabled?: boolean;
};

export type NotificationTemplateContext = Record<string, string | number | boolean | null | undefined>;

export type TicketNotificationEvent =
  | 'ticket.create'
  | 'ticket.status_change'
  | 'ticket.comment_add'
  | 'ticket.assign';

export type NotificationLogStatus = 'queued' | 'sent' | 'failed';

export type NotificationJobPayload = {
  tenantId: string;
  event: TicketNotificationEvent;
  ticketId?: string;
  number?: string;
  type?: string;
  requesterId?: string;
  assigneeId?: string;
  title?: string;
  status?: string;
  requesterName?: string;
  assigneeName?: string;
  requesterEmail?: string;
  assigneeEmail?: string;
  requesterPhone?: string;
  assigneePhone?: string;
  assigneeChatId?: string;
  message?: string;
  locale?: 'en' | 'id';
};

export type NotificationChannelRow = {
  id: string;
  tenant_id: string;
  type: NotificationChannelType;
  config: NotificationChannelConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
};
