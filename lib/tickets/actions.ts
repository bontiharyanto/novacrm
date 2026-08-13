'use server';

import { ticketCommentSchema, ticketSchema, ticketStatusUpdateSchema } from '@/lib/tickets/schema';
import { dispatchTicketNotification } from '@/lib/notifications/dispatcher';
import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { canRole } from '@/lib/rbac/ability';
import { normalizePhone, safeNotificationText } from '@/lib/notifications/helpers';
import { mapTicketRow, textToDescription, type TicketRecord } from '@/lib/tickets/mappers';
import { evaluateWorkflow } from '@/lib/workflows/automation';
import type { SupabaseClient } from '@supabase/supabase-js';

const TICKET_SELECT = '*, ticket_comments(*)';

function getDefaultDueDate(priority: 'low' | 'medium' | 'high' | 'critical') {
  const now = new Date();
  const hours = { low: 72, medium: 24, high: 8, critical: 4 }[priority];
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

async function loadTicket(client: SupabaseClient, ticketId: string, tenantId?: string) {
  let query = client.from('tickets').select(TICKET_SELECT).eq('id', ticketId);
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: 'Ticket not found' };
  }

  const ticket = mapTicketRow(data);
  const comments = (data.ticket_comments ?? []) as Array<{
    id: string;
    author_id?: string | null;
    message: string;
    created_at: string;
    created_by?: string | null;
  }>;

  const authorIds = comments.map((item) => item.created_by || item.author_id).filter(Boolean) as string[];
  if (authorIds.length > 0) {
    const { data: profiles } = await client.from('profiles').select('id, full_name').in('id', authorIds);
    const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
    ticket.comments = comments
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        author: names.get(item.created_by || item.author_id || '') || 'Agent',
        comment: item.message,
        createdAt: item.created_at,
      }));
  }

  return { data: ticket, error: null };
}

export async function listTickets() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapTicketRow(row));
}

export async function getTicketById(ticketId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const result = await loadTicket(supabase, ticketId, session.profile.tenantId);
  return result.data;
}

export async function createTicket(input: unknown) {
  const parsed = ticketSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const requesterId = session.profile.role === 'customer' ? session.userId : parsed.requesterId ?? null;

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      tenant_id: session.profile.tenantId,
      title: parsed.title,
      description: textToDescription(parsed.description),
      status: parsed.status,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? getDefaultDueDate(parsed.priority),
      requester_id: requesterId,
      requester_name: safeNotificationText(parsed.requesterName, session.profile.fullName),
      requester_email: parsed.requesterEmail ?? session.profile.email,
      requester_phone: normalizePhone(parsed.requesterPhone) || session.profile.phone,
      assignee_id: parsed.assigneeId ?? null,
      assignee_name: parsed.assigneeName,
      assignee_chat_id: parsed.assigneeChatId,
      asset_id: parsed.assetId ?? null,
      category: parsed.category,
      created_by: session.userId,
    })
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create ticket' };
  }

  const ticket = mapTicketRow(data);
  await afterTicketMutation('ticket.create', ticket);
  return { data: ticket, error: null };
}

export async function createInboundTicket(tenantId: string, input: unknown) {
  const parsed = ticketSchema.parse({ ...input as object, tenantId });
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      tenant_id: tenantId,
      title: parsed.title,
      description: textToDescription(parsed.description),
      status: parsed.status,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? getDefaultDueDate(parsed.priority),
      requester_name: safeNotificationText(parsed.requesterName, 'Customer'),
      requester_email: parsed.requesterEmail,
      requester_phone: normalizePhone(parsed.requesterPhone),
      assignee_chat_id: parsed.assigneeChatId,
      category: parsed.category ?? 'inbound',
    })
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create inbound ticket' };
  }

  const ticket = mapTicketRow(data);
  await afterTicketMutation('ticket.create', ticket);
  return { data: ticket, error: null };
}

export async function updateTicketStatus(ticketId: string, input: unknown) {
  const parsed = ticketStatusUpdateSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const existing = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!existing.data) {
    return { data: null, error: existing.error ?? 'Ticket not found' };
  }

  const previousStatus = existing.data.status;
  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: parsed.status,
      assignee_name: parsed.assigneeName ?? existing.data.assigneeName,
      assignee_chat_id: parsed.assigneeChatId ?? existing.data.assigneeChatId,
      assignee_id: parsed.assigneeId ?? existing.data.assigneeId ?? null,
    })
    .eq('id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update ticket' };
  }

  const ticket = mapTicketRow(data);
  await afterTicketMutation('ticket.status_change', ticket, `Status berubah dari ${previousStatus} menjadi ${ticket.status}`);
  return { data: ticket, error: null };
}

export async function addTicketComment(ticketId: string, input: unknown) {
  const parsed = ticketCommentSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const existing = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!existing.data) {
    return { data: null, error: existing.error ?? 'Ticket not found' };
  }

  const { error } = await supabase.from('ticket_comments').insert({
    tenant_id: session.profile.tenantId,
    ticket_id: ticketId,
    author_id: session.userId,
    created_by: session.userId,
    message: parsed.comment,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const reloaded = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!reloaded.data) {
    return { data: null, error: reloaded.error };
  }

  await afterTicketMutation('ticket.comment_add', reloaded.data, parsed.comment);
  const comment = reloaded.data.comments.at(-1);
  return { data: comment ?? { id: ticketId, author: parsed.author, comment: parsed.comment, createdAt: new Date().toISOString() }, error: null };
}

async function afterTicketMutation(
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add',
  ticket: TicketRecord,
  message?: string,
) {
  await evaluateWorkflow(event, { ticketId: ticket.id, tenantId: ticket.tenantId, status: ticket.status });
  await dispatchTicketNotification({
    event,
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      requesterPhone: ticket.requesterPhone,
      assigneeName: ticket.assigneeName,
      assigneeChatId: ticket.assigneeChatId,
      tenantId: ticket.tenantId,
    },
    message,
  });
}
