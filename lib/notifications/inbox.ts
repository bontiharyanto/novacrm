import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { parseAppRole, ROLE_RANK, type AppRole } from '@/lib/rbac/roles';

export const INBOX_KINDS = ['assign', 'comment', 'status', 'rca', 'ticket'] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  href?: string;
  ticketId?: string;
  readAt?: string;
  createdAt: string;
};

export type InboxDraft = {
  userId: string;
  kind: InboxKind;
  title: string;
  body: string;
  href?: string;
  ticketId?: string;
};

function inboxWriter() {
  return hasServiceRole() ? createSupabaseAdminClient() : null;
}

function mapRow(row: {
  id: string;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
  ticket_id?: string | null;
  read_at?: string | null;
  created_at: string;
}): InboxItem {
  return {
    id: row.id,
    kind: INBOX_KINDS.includes(row.kind as InboxKind) ? (row.kind as InboxKind) : 'ticket',
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    ticketId: row.ticket_id ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function createInboxItems(input: {
  tenantId: string;
  actorId?: string;
  items: InboxDraft[];
  includeActor?: boolean;
}) {
  const unique = input.items.filter(
    (item, index, list) =>
      item.userId &&
      (input.includeActor || item.userId !== input.actorId) &&
      list.findIndex((row) => row.userId === item.userId && row.kind === item.kind && row.title === item.title) === index,
  );
  if (unique.length === 0) {
    return { count: 0, error: null };
  }

  const supabase = inboxWriter() ?? (await createSupabaseServerClient());
  const { error } = await supabase.from('in_app_notifications').insert(
    unique.map((item) => ({
      tenant_id: input.tenantId,
      user_id: item.userId,
      kind: item.kind,
      title: item.title.slice(0, 180),
      body: item.body.slice(0, 500),
      href: item.href ?? null,
      ticket_id: item.ticketId ?? null,
      created_by: input.actorId ?? null,
    })),
  );
  if (error) {
    console.error('[inbox] insert failed', error.message);
  }
  return { count: error ? 0 : unique.length, error: error?.message ?? null };
}

export async function listInboxItems() {
  const session = await getSessionProfile();
  if (!session) {
    return { data: [] as InboxItem[], unread: 0, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('in_app_notifications')
    .select('id, kind, title, body, href, ticket_id, read_at, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return { data: [] as InboxItem[], unread: 0, error: error.message };
  }

  const items = (data ?? []).map(mapRow);
  return { data: items, unread: items.filter((item) => !item.readAt).length, error: null };
}

export async function markInboxRead(id?: string) {
  const session = await getSessionProfile();
  if (!session) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', session.profile.tenantId)
    .eq('user_id', session.userId)
    .is('read_at', null);

  if (id) {
    query = query.eq('id', id);
  }

  const { error } = await query;
  return { data: error ? null : true, error: error?.message ?? null };
}

async function groupMemberIds(tenantId: string, groupId: string) {
  const supabase = inboxWriter() ?? (await createSupabaseServerClient());
  const { data } = await supabase
    .from('assignment_group_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId);
  return (data ?? []).map((row) => row.user_id as string);
}

export async function staffIdsAtLeast(tenantId: string, minRole: AppRole, accountId?: string) {
  const supabase = inboxWriter() ?? (await createSupabaseServerClient());
  let userIds: string[] | null = null;
  if (accountId) {
    const [{ data: members }, { data: groups }] = await Promise.all([
      supabase
        .from('account_members')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .neq('role', 'portal'),
      supabase.from('assignment_groups').select('id').eq('tenant_id', tenantId).eq('account_id', accountId),
    ]);
    const groupIds = (groups ?? []).map((row) => row.id as string);
    const { data: groupMembers } =
      groupIds.length > 0
        ? await supabase
            .from('assignment_group_members')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .in('group_id', groupIds)
        : { data: [] };
    userIds = Array.from(
      new Set([
        ...(members ?? []).map((row) => row.user_id as string),
        ...(groupMembers ?? []).map((row) => row.user_id as string),
      ]),
    );
    if (userIds.length === 0) return [];
  }

  let query = supabase.from('profiles').select('id, role').eq('tenant_id', tenantId);
  if (userIds) query = query.in('id', userIds);
  const { data } = await query;
  const min = ROLE_RANK[minRole];
  return (data ?? [])
    .filter((row) => ROLE_RANK[parseAppRole(row.role)] >= min)
    .map((row) => row.id as string);
}

export async function notifyTicketInbox(input: {
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add' | 'ticket.assign';
  tenantId: string;
  actorId?: string;
  ticket: {
    id: string;
    number?: string;
    title: string;
    status: string;
    assigneeId?: string;
    requesterId?: string;
    groupId?: string;
    accountId?: string;
  };
  message?: string;
}) {
  const number = input.ticket.number || input.ticket.id.slice(0, 8);
  const deskHref = `/tickets/${input.ticket.id}`;
  const portalHref = `/portal/${input.ticket.id}`;
  const staffDrafts: InboxDraft[] = [];
  const requesterDrafts: InboxDraft[] = [];

  if (input.event === 'ticket.create') {
    if (input.ticket.assigneeId) {
      staffDrafts.push({
        userId: input.ticket.assigneeId,
        kind: 'ticket',
        title: `${number} opened`,
        body: input.ticket.title,
        href: deskHref,
        ticketId: input.ticket.id,
      });
    } else {
      const queueIds = input.ticket.groupId
        ? await groupMemberIds(input.tenantId, input.ticket.groupId)
        : [];
      const watchers =
        queueIds.length > 0
          ? queueIds
          : await staffIdsAtLeast(input.tenantId, 'team_lead', input.ticket.accountId);
      for (const userId of watchers) {
        staffDrafts.push({
          userId,
          kind: 'ticket',
          title: `${number} in queue`,
          body: input.ticket.title,
          href: deskHref,
          ticketId: input.ticket.id,
        });
      }
    }
    if (input.ticket.requesterId) {
      requesterDrafts.push({
        userId: input.ticket.requesterId,
        kind: 'ticket',
        title: `${number} received`,
        body: input.ticket.title,
        href: portalHref,
        ticketId: input.ticket.id,
      });
    }
  } else if (input.ticket.assigneeId) {
    if (input.event === 'ticket.assign') {
      staffDrafts.push({
        userId: input.ticket.assigneeId,
        kind: 'assign',
        title: `${number} assigned to you`,
        body: input.ticket.title,
        href: deskHref,
        ticketId: input.ticket.id,
      });
    } else if (input.event === 'ticket.comment_add') {
      staffDrafts.push({
        userId: input.ticket.assigneeId,
        kind: 'comment',
        title: `Comment on ${number}`,
        body: (input.message || input.ticket.title).replace(/<[^>]+>/g, ' ').slice(0, 180),
        href: deskHref,
        ticketId: input.ticket.id,
      });
    } else if (input.event === 'ticket.status_change') {
      staffDrafts.push({
        userId: input.ticket.assigneeId,
        kind: 'status',
        title: `${number} → ${input.ticket.status.replace('_', ' ')}`,
        body: input.ticket.title,
        href: deskHref,
        ticketId: input.ticket.id,
      });
    }
  }

  await createInboxItems({ tenantId: input.tenantId, actorId: input.actorId, items: staffDrafts });
  if (requesterDrafts.length > 0) {
    await createInboxItems({
      tenantId: input.tenantId,
      actorId: input.actorId,
      items: requesterDrafts,
      includeActor: true,
    });
  }
}
