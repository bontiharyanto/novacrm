'use server';

import { getAssistantThread } from '@/lib/assistant/store';

export async function loadAssistantThread(id: string) {
  return getAssistantThread(id);
}
