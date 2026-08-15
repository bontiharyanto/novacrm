import type { TicketRecord } from '@/lib/tickets/mappers';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UcCredit = {
  id: string;
  contractId: string;
  ticketId: string;
  ticketNumber?: string;
  ticketTitle?: string;
  groupId?: string;
  reason: string;
  creditMinutes: number;
  amountNote?: string;
  status: 'open' | 'applied' | 'waived';
  createdAt: string;
};

function minutesLate(deadline?: string | null, now = new Date()) {
  if (!deadline) return 0;
  const delta = now.getTime() - new Date(deadline).getTime();
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.round(delta / 60000);
}

export function creditMinutesForBreach(
  ticket: Pick<TicketRecord, 'olaResolveBy' | 'priority'>,
  asOf = new Date(),
) {
  const late = minutesLate(ticket.olaResolveBy, asOf);
  if (late <= 0) return 0;
  const floor = ticket.priority === 'critical' ? 120 : ticket.priority === 'high' ? 60 : 30;
  return Math.min(Math.max(late, floor), 2880);
}

function breachAsOf(ticket: TicketRecord) {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date();
  }
  if (ticket.slaPausedAt) return null;
  return new Date();
}

export async function maybeRecordUcCredit(
  client: SupabaseClient,
  ticket: TicketRecord,
  actorId?: string,
) {
  if (!ticket.ucId || !ticket.olaResolveBy) return;
  const asOf = breachAsOf(ticket);
  if (!asOf) return;

  const minutes = creditMinutesForBreach(ticket, asOf);
  if (minutes <= 0) return;

  const { data: contract } = await client
    .from('underpinning_contracts')
    .select('id, penalty_notes')
    .eq('id', ticket.ucId)
    .eq('tenant_id', ticket.tenantId)
    .maybeSingle();
  if (!contract) return;

  const { error } = await client.from('uc_credits').insert({
    tenant_id: ticket.tenantId,
    contract_id: ticket.ucId,
    ticket_id: ticket.id,
    group_id: ticket.groupId ?? null,
    reason: 'ola_resolve_breach',
    credit_minutes: minutes,
    amount_note: contract.penalty_notes ?? null,
    status: 'open',
    created_by: actorId ?? null,
  });
  if (error && error.code !== '23505') {
    console.error('uc_credits', error.message);
  }
}

export async function listUcCredits(contractId: string): Promise<UcCredit[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('uc_credits')
    .select('id, contract_id, ticket_id, group_id, reason, credit_minutes, amount_note, status, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  const rows = data ?? [];
  const ticketIds = rows.map((row) => row.ticket_id);
  const titles = new Map<string, { number?: string; title?: string }>();
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, number, title')
      .in('id', ticketIds);
    for (const ticket of tickets ?? []) {
      titles.set(ticket.id, { number: ticket.number ?? undefined, title: ticket.title });
    }
  }

  return rows.map((row) => ({
    id: row.id,
    contractId: row.contract_id,
    ticketId: row.ticket_id,
    ticketNumber: titles.get(row.ticket_id)?.number,
    ticketTitle: titles.get(row.ticket_id)?.title,
    groupId: row.group_id ?? undefined,
    reason: row.reason,
    creditMinutes: row.credit_minutes,
    amountNote: row.amount_note ?? undefined,
    status: row.status as UcCredit['status'],
    createdAt: row.created_at,
  }));
}

export async function listUcCreditsForReports() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('uc_credits')
    .select('contract_id, credit_minutes, status')
    .eq('tenant_id', session.profile.tenantId)
    .neq('status', 'waived');
  return data ?? [];
}
