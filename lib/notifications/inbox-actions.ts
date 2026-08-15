'use server';

import { listInboxItems, markInboxRead } from '@/lib/notifications/inbox';

export async function getInbox() {
  return listInboxItems();
}

export async function markInboxItemRead(id: string) {
  return markInboxRead(id);
}

export async function markInboxAllRead() {
  return markInboxRead();
}
