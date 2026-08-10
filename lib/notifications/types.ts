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
  | 'ticket.comment_add';

export type NotificationLogStatus = 'queued' | 'sent' | 'failed';

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
