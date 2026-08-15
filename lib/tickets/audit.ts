import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TicketAuditEvent } from '@/lib/tickets/audit-types';

export type { TicketAuditEvent };

export async function recordTicketAudit(
  client: SupabaseClient,
  input: {
    tenantId: string;
    ticketId: string;
    actorId?: string | null;
    actorName?: string;
    action: string;
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
  },
) {
  const { error } = await client.from('ticket_audit_events').insert({
    tenant_id: input.tenantId,
    ticket_id: input.ticketId,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    action: input.action,
    field: input.field ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    created_by: input.actorId ?? null,
  });
  if (error) {
    console.error('ticket_audit_events', error.message);
  }
}

export async function recordTicketAuditDiff(
  client: SupabaseClient,
  input: {
    tenantId: string;
    ticketId: string;
    actorId?: string | null;
    actorName?: string;
    changes: Array<{ field: string; oldValue?: string | null; newValue?: string | null }>;
  },
) {
  const rows = input.changes.filter((item) => (item.oldValue ?? '') !== (item.newValue ?? ''));
  if (rows.length === 0) return;
  await Promise.all(
    rows.map((item) =>
      recordTicketAudit(client, {
        tenantId: input.tenantId,
        ticketId: input.ticketId,
        actorId: input.actorId,
        actorName: input.actorName,
        action: 'updated',
        field: item.field,
        oldValue: item.oldValue,
        newValue: item.newValue,
      }),
    ),
  );
}

export async function listTicketAudit(ticketId: string): Promise<TicketAuditEvent[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ticket_audit_events')
    .select('id, ticket_id, actor_name, action, field, old_value, new_value, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(80);

  return (data ?? []).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    actorName: row.actor_name ?? undefined,
    action: row.action,
    field: row.field ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function listRecentAudit(query = ''): Promise<TicketAuditEvent[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ticket_audit_events')
    .select('id, ticket_id, actor_name, action, field, old_value, new_value, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = data ?? [];
  const ticketIds = Array.from(new Set(rows.map((row) => row.ticket_id)));
  const titles = new Map<string, { number: string; title: string }>();
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase.from('tickets').select('id, number, title').in('id', ticketIds);
    for (const ticket of tickets ?? []) {
      titles.set(ticket.id, { number: ticket.number || ticket.id.slice(0, 8), title: ticket.title });
    }
  }

  const needle = query.trim().toLowerCase();
  return rows
    .map((row) => {
      const ticket = titles.get(row.ticket_id);
      return {
        id: row.id,
        ticketId: row.ticket_id,
        ticketNumber: ticket?.number,
        ticketTitle: ticket?.title,
        actorName: row.actor_name ?? undefined,
        action: row.action,
        field: row.field ?? undefined,
        oldValue: row.old_value ?? undefined,
        newValue: row.new_value ?? undefined,
        createdAt: row.created_at,
      };
    })
    .filter((row) => {
      if (!needle) return true;
      return [row.ticketNumber, row.ticketTitle, row.actorName, row.action, row.field, row.oldValue, row.newValue]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
}
