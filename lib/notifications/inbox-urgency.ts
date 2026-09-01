import type { InboxItem, InboxKind } from '@/lib/notifications/inbox';

export type InboxUrgency = 'urgent' | 'normal';

const URGENT_KINDS = new Set<InboxKind>(['assign', 'swap']);

const URGENT_PATTERN = /\b(breach|sla|critical|eskalasi|urgent|overdue|unassigned)\b/i;

export function inboxUrgency(item: InboxItem): InboxUrgency {
  if (!item.readAt && URGENT_KINDS.has(item.kind)) return 'urgent';
  if (!item.readAt && URGENT_PATTERN.test(`${item.title} ${item.body}`)) return 'urgent';
  return 'normal';
}

export function inboxUnreadCounts(items: InboxItem[]) {
  const unread = items.filter((item) => !item.readAt);
  const urgent = unread.filter((item) => inboxUrgency(item) === 'urgent').length;
  return { total: unread.length, urgent, normal: unread.length - urgent };
}
