import { notificationCopy } from '@/lib/notifications/locale';
import { lineForEvent, type NotificationCopy, type StoredNotificationTemplates } from '@/lib/notifications/copy';
import { renderTemplate } from '@/lib/notifications/render';
import type { Locale } from '@/lib/preferences';

export type NotificationTemplate = {
  subject?: string;
  body: string;
};

export { renderTemplate };

export function getTicketTemplates(
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign',
  locale?: Locale,
  copy?: NotificationCopy & { byType?: StoredNotificationTemplates['byType'] },
  type?: string,
) {
  const resolved = copy ?? notificationCopy(locale);
  const line = lineForEvent(resolved, event, type);
  const templates: Record<typeof event, NotificationTemplate> = {
    'ticket.create': {
      subject: resolved.subjectCreated,
      body: `${resolved.hello} ${line}${resolved.viewDetails}`,
    },
    'ticket.status_change': {
      subject: resolved.subjectStatus,
      body: `${resolved.hello} ${line}${resolved.viewDetails}`,
    },
    'ticket.comment_add': {
      subject: resolved.subjectComment,
      body: `${resolved.hello} ${line}${resolved.viewDetails}`,
    },
    'ticket.assign': {
      subject: resolved.subjectAssigned,
      body: `${resolved.hello} ${line}${resolved.viewDetails}`,
    },
  };

  return templates[event];
}
