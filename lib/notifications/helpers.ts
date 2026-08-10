import { renderTemplate } from './templates';
import type { NotificationChannelConfig, NotificationChannelType, NotificationTemplateContext } from './types';

export function safeNotificationText(value: string | undefined, fallback: string) {
  return value && value.trim() ? value.trim() : fallback;
}

export function normalizePhone(value?: string) {
  if (!value) return '';
  return value.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
}

export function buildTicketNotificationMessage(
  ticket: {
    id: string;
    title: string;
    status: string;
    requesterName?: string;
  },
  messageOverride?: string
) {
  const name = safeNotificationText(ticket.requesterName, 'Customer');

  if (messageOverride) {
    return messageOverride;
  }

  return `Halo ${name}, tiket #${ticket.id} ${ticket.title} status berubah menjadi ${ticket.status}.`;
}

export function resolveChannelConfig(type: NotificationChannelType, config: NotificationChannelConfig) {
  switch (type) {
    case 'whatsapp':
      return {
        apiKey: config.apiKey ?? process.env.FONNTE_API_KEY,
        baseUrl: config.baseUrl ?? process.env.WHATSAPP_API_BASE_URL,
        target: config.target,
      };
    case 'telegram':
      return {
        botToken: config.botToken ?? process.env.TELEGRAM_BOT_TOKEN,
        chatId: config.chatId,
        baseUrl: config.baseUrl ?? process.env.TELEGRAM_API_BASE_URL,
      };
    case 'email':
      return {
        apiKey: config.apiKey ?? process.env.RESEND_API_KEY,
        from: config.from ?? process.env.EMAIL_FROM,
      };
    default:
      return {};
  }
}

export function buildNotificationBody(template: string, context: NotificationTemplateContext) {
  return renderTemplate(template, context);
}
