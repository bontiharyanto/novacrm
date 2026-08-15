'use server';

import { ticketCommentSchema, ticketSchema, ticketUpdateSchema } from '@/lib/tickets/schema';
import { dispatchTicketNotification } from '@/lib/notifications/dispatcher';
import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { canRole } from '@/lib/rbac/ability';
import { normalizePhone, safeNotificationText } from '@/lib/notifications/helpers';
import { mapTicketRow, textToDescription, withAccounts, withAssets, withContracts, withGroups, type TicketRecord } from '@/lib/tickets/mappers';
import { evaluateWorkflow } from '@/lib/workflows/actions';
import { requireAccountId } from '@/lib/accounts/scope';
import { applyTicketSlaChange, snapshotSla } from '@/lib/sla/engine';
import { snapshotOla } from '@/lib/ola/engine';
import { recordTicketAudit, recordTicketAuditDiff } from '@/lib/tickets/audit';
import { defaultPendingReason, isPauseStatus } from '@/lib/tickets/pending';
import { dispatchTicket, resolveInboundGroupId } from '@/lib/wfm/dispatch';
import { enqueueWfmDispatch } from '@/lib/queue/wfm.queue';
import { maybeRecordUcCredit } from '@/lib/uc/credits';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeCommentHtml } from '@/lib/sanitize/html';

const TICKET_SELECT = '*, ticket_comments(*)';

async function hydrateTicketAssets(client: SupabaseClient, tickets: TicketRecord[]) {
  const ids = tickets.map((ticket) => ticket.assetId).filter((id): id is string => Boolean(id));
  const withAssetRows =
    ids.length === 0
      ? tickets
      : withAssets(tickets, ((await client.from('assets').select('id, name, asset_tag, type').in('id', ids)).data ?? []) as Array<{
          id: string;
          name: string;
          asset_tag?: string;
          type?: string;
        }>);

  const groupIds = withAssetRows.map((ticket) => ticket.groupId).filter((id): id is string => Boolean(id));
  const grouped =
    groupIds.length === 0
      ? withAssetRows
      : withGroups(
          withAssetRows,
          (
            await client
              .from('assignment_groups')
              .select('id, name, kind, tier, party_kind, party_name')
              .in('id', groupIds)
          ).data ?? [],
        );
  const ucIds = grouped.map((ticket) => ticket.ucId).filter((id): id is string => Boolean(id));
  if (ucIds.length === 0) return grouped;
  const { data: contracts } = await client.from('underpinning_contracts').select('id, name, contract_number').in('id', ucIds);
  return withContracts(grouped, contracts ?? []);
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

  const [ticket] = await hydrateTicketAssets(client, [mapTicketRow(data)]);

  if (ticket.problemId) {
    const { data: problem } = await client
      .from('tickets')
      .select('id, number, title, workaround')
      .eq('id', ticket.problemId)
      .eq('tenant_id', ticket.tenantId)
      .maybeSingle();
    if (problem) {
      ticket.problemNumber = problem.number ?? undefined;
      ticket.problemTitle = problem.title;
      ticket.problemWorkaround = problem.workaround ?? undefined;
    }
  }

  if (ticket.type === 'problem') {
    const { data: children } = await client
      .from('tickets')
      .select('id, number, title, status')
      .eq('problem_id', ticket.id)
      .eq('tenant_id', ticket.tenantId)
      .order('created_at', { ascending: false });
    ticket.relatedIncidents = (children ?? []).map((row) => ({
      id: row.id,
      number: row.number || row.id.slice(0, 8),
      title: row.title,
      status: row.status,
    }));
  }

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

  const { data: csat } = await client
    .from('ticket_csat')
    .select('score, comment')
    .eq('ticket_id', ticket.id)
    .eq('tenant_id', ticket.tenantId)
    .maybeSingle();
  if (csat) {
    ticket.csatScore = csat.score;
    ticket.csatComment = csat.comment ?? undefined;
  }

  return { data: ticket, error: null };
}

export async function listTickets() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });
  if (scoped.accountId) {
    query = query.eq('account_id', scoped.accountId);
  }
  if (session.profile.role === 'agent') {
    query = query.or(`assignee_id.eq.${session.userId},and(created_by.eq.${session.userId},assignee_id.is.null)`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const tickets = await hydrateTicketAssets(
    supabase,
    data.map((row) => mapTicketRow(row)),
  );
  return withAccounts(tickets, scoped.scope.accounts);
}

export async function getTicketById(ticketId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const result = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!result.data) return null;
  const scoped = await requireAccountId(session);
  const [ticket] = withAccounts([result.data], scoped.scope.accounts);
  return ticket;
}

export async function createTicket(input: unknown) {
  const parsedResult = ticketSchema.safeParse(input);
  if (!parsedResult.success) {
    const issue = parsedResult.error.issues[0];
    const field = issue?.path?.length ? String(issue.path[0]) : '';
    const message =
      field === 'title'
        ? 'Fill the short description (ticket title) before creating.'
        : field === 'accountId' || field === 'assigneeId' || field === 'groupId' || field === 'assetId'
          ? 'One of the selected records has an invalid id.'
          : field === 'requesterEmail'
            ? 'Requester email is not valid.'
            : issue?.message ?? 'Invalid ticket';
    return { data: null, error: message };
  }
  const parsed = parsedResult.data;
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'create', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  if (session.profile.role !== 'customer' && !parsed.accountId) {
    return { data: null, error: 'Select the customer account for this ticket' };
  }

  const supabase = await createSupabaseServerClient();
  const requesterId = session.profile.role === 'customer' ? session.userId : parsed.requesterId ?? null;
  const assigneePatch = await resolveAssignee(supabase, session.profile.tenantId, parsed.assigneeId ?? undefined);
  const scoped = await requireAccountId(session, parsed.accountId);
  if (!scoped.accountId) {
    return { data: null, error: scoped.error ?? 'Select the customer account for this ticket' };
  }

  const sla = await snapshotSla(supabase, {
    tenantId: session.profile.tenantId,
    accountId: scoped.accountId,
    type: parsed.type,
    priority: parsed.priority,
    status: parsed.status,
    assigned: 'assignee_id' in assigneePatch && Boolean(assigneePatch.assignee_id),
    dueDateOverride: parsed.dueDate || undefined,
  });
  const ola = await snapshotOla(supabase, {
    tenantId: session.profile.tenantId,
    groupId: parsed.groupId,
    type: parsed.type,
    priority: parsed.priority,
  });

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      tenant_id: session.profile.tenantId,
      account_id: scoped.accountId,
      title: parsed.title,
      description: textToDescription(sanitizeCommentHtml(parsed.description ?? '')),
      type: parsed.type,
      status: parsed.status,
      priority: parsed.priority,
      ...sla,
      ...ola,
      requester_id: requesterId,
      requester_name: safeNotificationText(parsed.requesterName, session.profile.fullName),
      requester_email: parsed.requesterEmail ?? session.profile.email,
      requester_phone: normalizePhone(parsed.requesterPhone) || session.profile.phone,
      ...assigneePatch,
      asset_id: parsed.assetId ?? null,
      group_id: parsed.groupId ?? null,
      category: parsed.category,
      catalog_item_id: parsed.catalogItemId ?? null,
      catalog_answers: parsed.catalogAnswers ?? {},
      change_type: parsed.type === 'change' ? parsed.changeType ?? 'normal' : null,
      risk_level: parsed.type === 'change' ? parsed.riskLevel ?? parsed.priority : null,
      planned_start: parsed.plannedStart || null,
      planned_end: parsed.plannedEnd || null,
      implementation_plan: parsed.implementationPlan ?? null,
      backout_plan: parsed.backoutPlan ?? null,
      created_by: session.userId,
    })
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create ticket' };
  }

  const [ticket] = await hydrateTicketAssets(supabase, [mapTicketRow(data)]);
  await recordTicketAudit(supabase, {
    tenantId: session.profile.tenantId,
    ticketId: ticket.id,
    actorId: session.userId,
    actorName: session.profile.fullName,
    action: 'created',
  });
  await afterTicketMutation('ticket.create', ticket);
  return { data: ticket, error: null };
}

export async function createInboundTicket(tenantId: string, input: unknown) {
  const parsed = ticketSchema.parse({ ...input as object, tenantId });
  const supabase = createSupabaseAdminClient();
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'internal')
    .maybeSingle();

  if (!account) {
    return { data: null, error: 'Internal account is missing' };
  }

  const sla = await snapshotSla(supabase, {
    tenantId,
    accountId: account.id,
    type: parsed.type,
    priority: parsed.priority,
    status: parsed.status,
    assigned: Boolean(parsed.assigneeChatId),
    dueDateOverride: parsed.dueDate || undefined,
  });

  const groupId = parsed.groupId ?? (await resolveInboundGroupId(supabase, tenantId));
  const ola = await snapshotOla(supabase, {
    tenantId,
    groupId,
    type: parsed.type,
    priority: parsed.priority,
  });

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      tenant_id: tenantId,
      account_id: account.id,
      title: parsed.title,
      description: textToDescription(sanitizeCommentHtml(parsed.description ?? '')),
      type: parsed.type,
      status: parsed.status,
      priority: parsed.priority,
      ...sla,
      ...ola,
      requester_name: safeNotificationText(parsed.requesterName, 'Customer'),
      requester_email: parsed.requesterEmail,
      requester_phone: normalizePhone(parsed.requesterPhone),
      assignee_chat_id: parsed.assigneeChatId,
      category: parsed.category ?? 'inbound',
      asset_id: parsed.assetId ?? null,
      group_id: groupId,
      catalog_item_id: parsed.catalogItemId ?? null,
      catalog_answers: parsed.catalogAnswers ?? {},
    })
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create inbound ticket' };
  }

  const [ticket] = await hydrateTicketAssets(supabase, [mapTicketRow(data)]);
  await recordTicketAudit(supabase, {
    tenantId,
    ticketId: ticket.id,
    actorName: 'Virtual Agent',
    action: 'created',
    field: parsed.catalogItemId ? 'catalog' : 'channel',
    newValue: parsed.catalogItemId ?? parsed.category ?? 'inbound',
  });
  await afterTicketMutation('ticket.create', ticket);
  return { data: ticket, error: null };
}

async function resolveAssignee(
  client: SupabaseClient,
  tenantId: string,
  assigneeId: string | null | undefined,
) {
  if (assigneeId === undefined) {
    return {};
  }
  if (assigneeId === null) {
    return { assignee_id: null, assignee_name: null, assignee_chat_id: null };
  }

  const { data } = await client
    .from('profiles')
    .select('id, full_name, telegram_chat_id')
    .eq('id', assigneeId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) {
    return { assignee_id: null, assignee_name: null, assignee_chat_id: null };
  }

  return {
    assignee_id: data.id,
    assignee_name: data.full_name,
    assignee_chat_id: data.telegram_chat_id,
  };
}

export async function updateTicket(ticketId: string, input: unknown) {
  const parsed = ticketUpdateSchema.parse(input);
  const session = await getSessionProfile();

  if (!session || !canRole(session.profile.role, 'update', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const existing = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!existing.data) {
    return { data: null, error: existing.error ?? 'Ticket not found' };
  }

  const assigneePatch = await resolveAssignee(supabase, session.profile.tenantId, parsed.assigneeId);
  const previousStatus = existing.data.status;
  const previousAssignee = existing.data.assigneeId ?? null;
  const previousGroup = existing.data.groupId ?? null;
  const nextType = parsed.type ?? existing.data.type;
  const escalating = Boolean(parsed.escalate && parsed.groupId);
  const nextStatus = escalating ? 'in_progress' : (parsed.status ?? existing.data.status);
  const nextGroupId = parsed.groupId === undefined ? existing.data.groupId ?? null : parsed.groupId;
  const pause = isPauseStatus(nextStatus);
  const pendingReason = escalating
    ? null
    : pause
      ? parsed.pendingReason ?? existing.data.pendingReason ?? defaultPendingReason(nextStatus, nextType)
      : null;
  const pendingNote = escalating || !pause ? null : parsed.pendingNote === undefined ? existing.data.pendingNote ?? null : parsed.pendingNote;
  const slaPatch = await applyTicketSlaChange(
    supabase,
    {
      accountId: existing.data.accountId,
      type: existing.data.type,
      status: existing.data.status,
      priority: existing.data.priority,
      createdAt: existing.data.createdAt,
      slaAgreementId: existing.data.slaAgreementId,
      slaResponseMinutes: existing.data.slaResponseMinutes,
      slaResolveMinutes: existing.data.slaResolveMinutes,
      slaResponseAt: existing.data.slaResponseAt,
      slaResolveBy: existing.data.slaResolveBy,
      slaRespondedAt: existing.data.slaRespondedAt,
      slaPausedAt: existing.data.slaPausedAt,
      dueDate: existing.data.dueDate,
    },
    {
      status: nextStatus,
      assigneeId: escalating
        ? null
        : 'assignee_id' in assigneePatch
          ? (assigneePatch.assignee_id as string | null)
          : undefined,
    },
  );

  let problemId = parsed.problemId === undefined ? existing.data.problemId ?? null : parsed.problemId;
  if (problemId) {
    const { data: problem } = await supabase
      .from('tickets')
      .select('id, type')
      .eq('id', problemId)
      .eq('tenant_id', session.profile.tenantId)
      .maybeSingle();
    if (!problem || problem.type !== 'problem') {
      return { data: null, error: 'Related record must be a problem ticket' };
    }
    if (problemId === ticketId) {
      return { data: null, error: 'A problem cannot link to itself' };
    }
  }

  const resolvedAt =
    nextStatus === 'resolved' || nextStatus === 'closed'
      ? existing.data.resolvedAt ?? new Date().toISOString()
      : null;
  const olaPatch =
    nextGroupId !== previousGroup
      ? await snapshotOla(supabase, {
          tenantId: session.profile.tenantId,
          groupId: nextGroupId,
          type: nextType,
          priority: parsed.priority ?? existing.data.priority,
        })
      : {};

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: nextStatus,
      type: nextType,
      priority: parsed.priority ?? existing.data.priority,
      asset_id: parsed.assetId === undefined ? existing.data.assetId ?? null : parsed.assetId,
      group_id: nextGroupId,
      ...olaPatch,
      pending_reason: pendingReason,
      pending_note: pendingNote,
      problem_id: problemId,
      workaround: parsed.workaround === undefined ? existing.data.workaround ?? null : parsed.workaround,
      known_error: parsed.knownError ?? existing.data.knownError ?? false,
      resolved_at: resolvedAt,
      ...(escalating
        ? { assignee_id: null, assignee_name: null, assignee_chat_id: null }
        : assigneePatch),
      ...slaPatch,
    })
    .eq('id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update ticket' };
  }

  const [ticket] = await hydrateTicketAssets(supabase, [mapTicketRow(data)]);
  const nextAssignee = ticket.assigneeId ?? null;
  const messages: string[] = [];
  if (parsed.status && parsed.status !== previousStatus) {
    messages.push(`Status berubah dari ${previousStatus} menjadi ${ticket.status}`);
  }
  if (parsed.assigneeId !== undefined && nextAssignee !== previousAssignee) {
    messages.push(ticket.assigneeName ? `Assigned to ${ticket.assigneeName}` : 'Unassigned');
  }
  if (parsed.type && parsed.type !== existing.data.type) {
    messages.push(`Process changed to ${ticket.type}`);
  }
  if (parsed.assetId !== undefined && parsed.assetId !== (existing.data.assetId ?? null)) {
    messages.push(ticket.assetName ? `Configuration item ${ticket.assetTag ?? ticket.assetName}` : 'Configuration item cleared');
  }
  if (parsed.groupId !== undefined && parsed.groupId !== previousGroup) {
    messages.push(ticket.groupName ? `Queued to ${ticket.groupName}` : 'Assignment group cleared');
  }
  if (escalating && ticket.groupName) {
    messages.push(`Escalated to ${ticket.groupTier ? ticket.groupTier.toUpperCase() + ' ' : ''}${ticket.groupName}. SLA keeps running.`);
  }

  let hydrated = ticket;
  if (escalating && ticket.groupId) {
    const dispatched = await dispatchTicket(session.profile.tenantId, ticket.id, { force: true });
    if (dispatched.ok && dispatched.assigneeName) {
      messages.push(`Assigned to ${dispatched.assigneeName}`);
      const reloaded = await loadTicket(supabase, ticketId, session.profile.tenantId);
      if (reloaded.data) hydrated = reloaded.data;
    }
  }
  if (ticket.pendingReason && ticket.status !== previousStatus) {
    messages.push(
      ticket.pendingReason === 'vendor'
        ? `Pending vendor${ticket.pendingNote ? ` (${ticket.pendingNote})` : ''}. SLA paused.`
        : ticket.pendingReason === 'customer'
          ? `Waiting on customer${ticket.pendingNote ? ` (${ticket.pendingNote})` : ''}. SLA paused.`
          : `Change freeze${ticket.pendingNote ? ` (${ticket.pendingNote})` : ''}. SLA paused.`,
    );
  }

  await recordTicketAuditDiff(supabase, {
    tenantId: session.profile.tenantId,
    ticketId,
    actorId: session.userId,
    actorName: session.profile.fullName,
    changes: [
      { field: 'status', oldValue: previousStatus, newValue: ticket.status },
      { field: 'type', oldValue: existing.data.type, newValue: ticket.type },
      { field: 'priority', oldValue: existing.data.priority, newValue: ticket.priority },
      { field: 'assignee', oldValue: existing.data.assigneeName ?? previousAssignee, newValue: ticket.assigneeName ?? nextAssignee },
      { field: 'group', oldValue: existing.data.groupName ?? previousGroup, newValue: ticket.groupName ?? nextGroupId },
      { field: 'asset', oldValue: existing.data.assetId, newValue: ticket.assetId },
      { field: 'problem', oldValue: existing.data.problemId, newValue: ticket.problemId },
    ],
  });

  await maybeRecordUcCredit(supabase, hydrated, session.userId);
  const assigneeChanged = parsed.assigneeId !== undefined && nextAssignee !== previousAssignee;
  const statusChanged = Boolean(parsed.status && parsed.status !== previousStatus);
  await afterTicketMutation(
    assigneeChanged && !statusChanged ? 'ticket.assign' : 'ticket.status_change',
    hydrated,
    messages.join('. ') || undefined,
  );
  return { data: hydrated, error: null };
}

export async function updateTicketStatus(ticketId: string, input: unknown) {
  return updateTicket(ticketId, input);
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
    message: sanitizeCommentHtml(parsed.comment),
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (session.profile.role !== 'customer' && !existing.data.slaRespondedAt) {
    const slaPatch = await applyTicketSlaChange(
      supabase,
      {
        accountId: existing.data.accountId,
        type: existing.data.type,
        status: existing.data.status,
        priority: existing.data.priority,
        createdAt: existing.data.createdAt,
        slaAgreementId: existing.data.slaAgreementId,
        slaResponseMinutes: existing.data.slaResponseMinutes,
        slaResolveMinutes: existing.data.slaResolveMinutes,
        slaResponseAt: existing.data.slaResponseAt,
        slaResolveBy: existing.data.slaResolveBy,
        slaRespondedAt: existing.data.slaRespondedAt,
        slaPausedAt: existing.data.slaPausedAt,
        dueDate: existing.data.dueDate,
      },
      { staffResponded: true },
    );
    if (Object.keys(slaPatch).length > 0) {
      await supabase.from('tickets').update(slaPatch).eq('id', ticketId).eq('tenant_id', session.profile.tenantId);
    }
  }

  const reloaded = await loadTicket(supabase, ticketId, session.profile.tenantId);
  if (!reloaded.data) {
    return { data: null, error: reloaded.error };
  }

  await recordTicketAudit(supabase, {
    tenantId: session.profile.tenantId,
    ticketId,
    actorId: session.userId,
    actorName: session.profile.fullName,
    action: 'commented',
  });
  await afterTicketMutation('ticket.comment_add', reloaded.data, parsed.comment);
  const comment = reloaded.data.comments.at(-1);
  return { data: comment ?? { id: ticketId, author: parsed.author, comment: parsed.comment, createdAt: new Date().toISOString() }, error: null };
}

async function afterTicketMutation(
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign',
  ticket: TicketRecord,
  message?: string,
) {
  if (event !== 'ticket.assign') {
    await evaluateWorkflow(event, { ticketId: ticket.id, tenantId: ticket.tenantId, status: ticket.status }, ticket);
  }
  if (event === 'ticket.create' && !ticket.assigneeId) {
    await enqueueWfmDispatch({ tenantId: ticket.tenantId, ticketId: ticket.id });
  }
  await dispatchTicketNotification({
    event,
    ticket: {
      id: ticket.id,
      number: ticket.number,
      type: ticket.type,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      requesterPhone: ticket.requesterPhone,
      assigneeId: ticket.assigneeId,
      assigneeName: ticket.assigneeName,
      assigneeChatId: ticket.assigneeChatId,
      tenantId: ticket.tenantId,
    },
    message,
  });
}
