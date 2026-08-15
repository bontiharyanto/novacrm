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
      subject: '{{number}} opened · {{title}}',
      body: 'Halo {{name}}, {{number}} ({{type}}) telah dibuat. Status: {{status}}. Tim kami akan segera menindaklanjuti.',
    },
    'ticket.status_change': {
      subject: '{{number}} {{status}} · {{title}}',
      body: 'Halo {{name}}, {{number}} status berubah menjadi {{status}}. {{message}}{{csat}}',
    },
    'ticket.comment_add': {
      subject: '{{number}} new comment · {{title}}',
      body: 'Halo {{name}}, ada komentar baru di {{number}}. {{message}}',
    },
  };

  return templates[event];
}
