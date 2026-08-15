import { notificationCopy } from '@/lib/notifications/locale';
import type { Locale } from '@/lib/preferences';
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

export function getTicketTemplates(
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign',
  locale?: Locale,
) {
  const t = notificationCopy(locale);
  const templates: Record<typeof event, NotificationTemplate> = {
    'ticket.create': {
      subject: t.subjectCreated,
      body: `${t.hello} ${t.created}`,
    },
    'ticket.status_change': {
      subject: t.subjectStatus,
      body: `${t.hello} ${t.statusChanged}`,
    },
    'ticket.comment_add': {
      subject: t.subjectComment,
      body: `${t.hello} ${t.commentAdded}`,
    },
    'ticket.assign': {
      subject: t.subjectAssigned,
      body: `${t.hello} ${t.assigned}`,
    },
  };

  return templates[event];
}
