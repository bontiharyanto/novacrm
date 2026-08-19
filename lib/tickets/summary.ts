'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import { getTicketById } from '@/lib/tickets/actions';

export async function summarizeTicket(ticketId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    return { data: null, error: 'Ticket not found' };
  }

  const ai = await getAiConfigForTenant(session.profile.tenantId);
  if (!ai) {
    return { data: null, error: 'Configure an AI plugin under Integrations first.' };
  }

  const comments = ticket.comments
    .slice(-12)
    .map((item) => `${item.author}: ${item.comment.replace(/<[^>]+>/g, ' ').slice(0, 400)}`)
    .join('\n');

  const result = await completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    maxTokens: 280,
    messages: [
      {
        role: 'system',
        content:
          'You summarize ITSM tickets for agents. Reply in the same language as the ticket (Indonesian or English). Exactly 3 short lines: 1) what happened 2) what was tried 3) next action. No markdown headings.',
      },
      {
        role: 'user',
        content: [
          `Number: ${ticket.number}`,
          `Type: ${ticket.type} · ${ticket.status} · ${ticket.priority}`,
          `Title: ${ticket.title}`,
          `Description: ${ticket.description.slice(0, 1200)}`,
          ticket.workaround ? `Workaround: ${ticket.workaround}` : '',
          comments ? `Comments:\n${comments}` : 'No comments yet.',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  });

  if (!result.ok) {
    return { data: null, error: result.error };
  }
  if (!result.content.trim()) {
    return { data: null, error: 'Unable to summarize ticket' };
  }

  const summary = result.content.trim().slice(0, 2000);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tickets')
    .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { summary, at: new Date().toISOString() }, error: null };
}

export async function listProblemOptions(accountId?: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tickets')
    .select('id, number, title, status')
    .eq('tenant_id', session.profile.tenantId)
    .eq('type', 'problem')
    .order('created_at', { ascending: false })
    .limit(40);
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number || row.id.slice(0, 8),
    title: row.title,
    status: row.status,
  }));
}

export type MajorLinkOption = { id: string; number: string; title: string; status: string };

export async function listMajorParentOptions(accountId?: string, excludeId?: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tickets')
    .select('id, number, title, status')
    .eq('tenant_id', session.profile.tenantId)
    .eq('type', 'incident')
    .is('parent_ticket_id', null)
    .order('created_at', { ascending: false })
    .limit(40);
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number || row.id.slice(0, 8),
    title: row.title,
    status: row.status,
  })) satisfies MajorLinkOption[];
}

export async function listMajorChildOptions(accountId?: string, excludeId?: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tickets')
    .select('id, number, title, status')
    .eq('tenant_id', session.profile.tenantId)
    .in('type', ['incident', 'request'])
    .is('parent_ticket_id', null)
    .order('created_at', { ascending: false })
    .limit(60);
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const [{ data }, { data: usedAsParent }] = await Promise.all([
    query,
    supabase
      .from('tickets')
      .select('parent_ticket_id')
      .eq('tenant_id', session.profile.tenantId)
      .not('parent_ticket_id', 'is', null),
  ]);

  const parentIds = new Set(
    (usedAsParent ?? []).map((row) => row.parent_ticket_id).filter((id): id is string => Boolean(id)),
  );

  return (data ?? [])
    .filter((row) => !parentIds.has(row.id))
    .slice(0, 40)
    .map((row) => ({
      id: row.id,
      number: row.number || row.id.slice(0, 8),
      title: row.title,
      status: row.status,
    })) satisfies MajorLinkOption[];
}
