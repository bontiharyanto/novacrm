'use server';

import { knowledgeArticleSchema, type KnowledgeArticle } from '@/lib/knowledge/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';
import { descriptionToText } from '@/lib/tickets/mappers';

type ArticleRow = {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  ticket_id?: string | null;
  category?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

function mapArticle(row: ArticleRow, ticketNumber?: string): KnowledgeArticle {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    body: row.body,
    ticketId: row.ticket_id ?? undefined,
    ticketNumber,
    category: row.category ?? undefined,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listKnowledgeArticles(query?: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Knowledge')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from('knowledge_articles')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(40);

  const term = query?.trim();
  if (term) {
    request = request.or(`title.ilike.%${term.replace(/[%*,]/g, '')}%,body.ilike.%${term.replace(/[%*,]/g, '')}%`);
  }

  const { data } = await request;
  return (data ?? []).map((row) => mapArticle(row as ArticleRow));
}

export async function suggestKnowledge(title: string) {
  const words = title
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length >= 4)
    .slice(0, 4);
  if (words.length === 0) return [];
  return listKnowledgeArticles(words[0]);
}

export async function publishKnowledgeFromTicket(ticketId: string, input?: unknown) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Knowledge')) {
    return { data: null, error: 'Unauthorized' };
  }

  const parsed = input
    ? knowledgeArticleSchema.safeParse(input)
    : null;
  if (parsed && !parsed.success) {
    return { data: null, error: formatZodError(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, title, description, category, number, status')
    .eq('id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  if (!ticket) {
    return { data: null, error: 'Ticket not found' };
  }

  const title = parsed?.success ? parsed.data.title : String(ticket.title);
  const body = parsed?.success
    ? parsed.data.body
    : descriptionToText(ticket.description) || String(ticket.title);

  const { data, error } = await supabase
    .from('knowledge_articles')
    .insert({
      tenant_id: session.profile.tenantId,
      title,
      body,
      ticket_id: ticketId,
      category: parsed?.success ? parsed.data.category ?? ticket.category : ticket.category,
      is_published: parsed?.success ? parsed.data.isPublished : true,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to publish article' };
  }

  return { data: mapArticle(data as ArticleRow, ticket.number ?? undefined), error: null };
}
