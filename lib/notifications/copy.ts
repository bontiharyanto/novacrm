import { z } from 'zod';
import { getDictionary } from '@/lib/i18n';
import { TICKET_TYPES, type TicketType } from '@/lib/tickets/process';

export const NOTIFICATION_COPY_KEYS = [
  'hello',
  'created',
  'statusChanged',
  'commentAdded',
  'assigned',
  'subjectCreated',
  'subjectStatus',
  'subjectComment',
  'subjectAssigned',
  'csat',
  'viewDetails',
  'openTicket',
  'rateTicket',
  'telegramFallback',
  'whatsappFallback',
] as const;

export type NotificationCopyKey = (typeof NOTIFICATION_COPY_KEYS)[number];
export type NotificationCopy = Record<NotificationCopyKey, string>;

export type TypeTemplateOverride = {
  created?: string;
  statusChanged?: string;
  commentAdded?: string;
};

export type StoredNotificationTemplates = Partial<NotificationCopy> & {
  byType?: Partial<Record<TicketType, TypeTemplateOverride>>;
};

const lineSchema = z.string().max(2000);
const typeOverrideSchema = z.object({
  created: lineSchema.optional(),
  statusChanged: lineSchema.optional(),
  commentAdded: lineSchema.optional(),
});

export const storedNotificationTemplatesSchema = z.object({
  hello: lineSchema.optional(),
  created: lineSchema.optional(),
  statusChanged: lineSchema.optional(),
  commentAdded: lineSchema.optional(),
  assigned: lineSchema.optional(),
  subjectCreated: lineSchema.optional(),
  subjectStatus: lineSchema.optional(),
  subjectComment: lineSchema.optional(),
  subjectAssigned: lineSchema.optional(),
  csat: lineSchema.optional(),
  viewDetails: lineSchema.optional(),
  openTicket: lineSchema.optional(),
  rateTicket: lineSchema.optional(),
  telegramFallback: lineSchema.optional(),
  whatsappFallback: lineSchema.optional(),
  byType: z
    .object({
      incident: typeOverrideSchema.optional(),
      problem: typeOverrideSchema.optional(),
      change: typeOverrideSchema.optional(),
      request: typeOverrideSchema.optional(),
    })
    .optional(),
});

export function defaultNotificationCopy(locale?: string | null): NotificationCopy {
  const resolved = locale === 'en' || locale === 'id' ? locale : 'id';
  return getDictionary(resolved).notifications;
}

function filled(value?: string) {
  return Boolean(value && value.trim());
}

export function mergeNotificationCopy(
  defaults: NotificationCopy,
  stored?: StoredNotificationTemplates | null,
): NotificationCopy & { byType?: StoredNotificationTemplates['byType'] } {
  const next = { ...defaults };
  for (const key of NOTIFICATION_COPY_KEYS) {
    const custom = stored?.[key];
    if (filled(custom)) next[key] = custom as string;
  }
  return { ...next, byType: stored?.byType };
}

export function lineForEvent(
  copy: NotificationCopy & { byType?: StoredNotificationTemplates['byType'] },
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign',
  type?: string,
) {
  const process = TICKET_TYPES.includes(type as TicketType) ? (type as TicketType) : undefined;
  const typed = process ? copy.byType?.[process] : undefined;
  if (event === 'ticket.create') return filled(typed?.created) ? typed!.created! : copy.created;
  if (event === 'ticket.status_change') return filled(typed?.statusChanged) ? typed!.statusChanged! : copy.statusChanged;
  if (event === 'ticket.comment_add') return filled(typed?.commentAdded) ? typed!.commentAdded! : copy.commentAdded;
  return copy.assigned;
}

export const TEMPLATE_PLACEHOLDERS = [
  '{{name}}',
  '{{number}}',
  '{{type}}',
  '{{status}}',
  '{{title}}',
  '{{message}}',
  '{{csat}}',
  '{{url}}',
  '{{assignee}}',
] as const;
