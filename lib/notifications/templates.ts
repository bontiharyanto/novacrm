import type { NotificationTemplateContext } from './types';

export type NotificationTemplate = {
  subject?: string;
  body: string;
};

export function renderTemplate(template: string, context: NotificationTemplateContext): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function getTicketTemplates(event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add') {
  const templates: Record<typeof event, NotificationTemplate> = {
    'ticket.create': {
      subject: 'Ticket #{{id}} dibuat',
      body: 'Halo {{name}}, ticket #{{id}} telah dibuat. Status: {{status}}. Tim kami akan segera menindaklanjuti.',
    },
    'ticket.status_change': {
      subject: 'Ticket #{{id}} status berubah',
      body: 'Halo {{name}}, ticket #{{id}} status berubah menjadi {{status}}. Terima kasih atas kesabaran Anda.',
    },
    'ticket.comment_add': {
      subject: 'Ada komentar baru di ticket #{{id}}',
      body: 'Halo {{name}}, ada komentar baru di ticket #{{id}}. Silakan cek dashboard untuk pembaruan terbaru.',
    },
  };

  return templates[event];
}
