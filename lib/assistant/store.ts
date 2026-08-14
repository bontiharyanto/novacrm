import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  assistantMessageSchema,
  type AssistantMessage,
  type AssistantThread,
  type AssistantThreadSummary,
} from '@/lib/assistant/schema';

function sanitizeMessages(raw: unknown): AssistantMessage[] {
  if (!Array.isArray(raw)) return [];
  const parsed: AssistantMessage[] = [];
  for (const item of raw) {
    const result = assistantMessageSchema.safeParse(item);
    if (result.success) parsed.push(result.data);
  }
  return parsed.slice(-40);
}

function titleFrom(messages: AssistantMessage[]) {
  const first = messages.find((item) => item.role === 'user')?.content.trim() ?? '';
  return first.slice(0, 80) || 'Chat';
}

function toSummary(row: { id: string; title: string; updated_at: string; messages: unknown }): AssistantThreadSummary {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    messageCount: Array.isArray(row.messages) ? row.messages.length : 0,
  };
}

async function requireStaff() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return { session: null, error: 'Unauthorized' as const };
  }
  return { session, error: null };
}

export async function listAssistantThreads(): Promise<{
  data: { threads: AssistantThreadSummary[]; current: AssistantThread | null };
  error: string | null;
}> {
  const auth = await requireStaff();
  if (auth.error || !auth.session) {
    return { data: { threads: [], current: null }, error: auth.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assistant_threads')
    .select('id, title, messages, updated_at')
    .eq('tenant_id', auth.session.profile.tenantId)
    .eq('user_id', auth.session.profile.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) {
    return { data: { threads: [], current: null }, error: error.message };
  }

  const rows = data ?? [];
  const threads = rows.map(toSummary);
  const latest = rows[0];
  const current = latest
    ? { ...toSummary(latest), messages: sanitizeMessages(latest.messages) }
    : null;

  return { data: { threads, current }, error: null };
}

export async function getAssistantThread(id: string): Promise<{ data: AssistantThread | null; error: string | null }> {
  const auth = await requireStaff();
  if (auth.error || !auth.session) {
    return { data: null, error: auth.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('assistant_threads')
    .select('id, title, messages, updated_at')
    .eq('id', id)
    .eq('user_id', auth.session.profile.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Thread not found' };

  return {
    data: { ...toSummary(data), messages: sanitizeMessages(data.messages) },
    error: null,
  };
}

export async function upsertAssistantThread(input: {
  id?: string | null;
  messages: AssistantMessage[];
}): Promise<{ data: AssistantThreadSummary | null; error: string | null }> {
  const auth = await requireStaff();
  if (auth.error || !auth.session) {
    return { data: null, error: auth.error };
  }

  const messages = sanitizeMessages(input.messages);
  if (messages.length === 0) {
    return { data: null, error: 'Empty thread' };
  }

  const supabase = await createSupabaseServerClient();
  const title = titleFrom(messages);
  const row = {
    tenant_id: auth.session.profile.tenantId,
    user_id: auth.session.profile.id,
    title,
    messages,
    created_by: auth.session.profile.id,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('assistant_threads')
      .update({ title, messages })
      .eq('id', input.id)
      .eq('user_id', auth.session.profile.id)
      .select('id, title, messages, updated_at')
      .maybeSingle();

    if (!error && data) {
      return { data: toSummary(data), error: null };
    }
  }

  const { data, error } = await supabase
    .from('assistant_threads')
    .insert(row)
    .select('id, title, messages, updated_at')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to save thread' };
  }
  return { data: toSummary(data), error: null };
}
