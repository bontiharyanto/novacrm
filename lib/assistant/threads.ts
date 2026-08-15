'use server';

import { getAssistantThread, listAssistantThreads } from '@/lib/assistant/store';

export async function loadAssistantThread(id: string) {
  return getAssistantThread(id);
}

export async function listAssistantThreadSummaries() {
  const result = await listAssistantThreads();
  return { data: result.data.threads, error: result.error };
}
