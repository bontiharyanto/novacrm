'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole, isStaffRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';
import { submitCsatSchema, type CsatResponse } from '@/lib/csat/schema';

function mapCsat(row: {
  ticket_id: string;
  score: number;
  comment?: string | null;
  created_at: string;
}): CsatResponse {
  return {
    ticketId: row.ticket_id,
    score: row.score as CsatResponse['score'],
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getTicketCsat(ticketId: string): Promise<CsatResponse | null> {
  const session = await getSessionProfile();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ticket_csat')
    .select('ticket_id, score, comment, created_at')
    .eq('ticket_id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  return data ? mapCsat(data) : null;
}

export async function submitTicketCsat(input: unknown) {
  const parsed = submitCsatSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };

  const session = await getSessionProfile();
  if (!session || !isCustomerRole(session.profile.role)) {
    return { data: null, error: 'Only the requester can rate this ticket' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, status, requester_id')
    .eq('id', parsed.data.ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();

  if (!ticket || ticket.requester_id !== session.userId) {
    return { data: null, error: 'Ticket not found' };
  }
  if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
    return { data: null, error: 'Rate the ticket after it is resolved' };
  }

  const { data, error } = await supabase
    .from('ticket_csat')
    .insert({
      tenant_id: session.profile.tenantId,
      ticket_id: parsed.data.ticketId,
      score: parsed.data.score,
      comment: parsed.data.comment || null,
      created_by: session.userId,
    })
    .select('ticket_id, score, comment, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return { data: null, error: 'This ticket already has a rating' };
    return { data: null, error: error.message };
  }
  return { data: mapCsat(data), error: null };
}

export async function listCsatForReports() {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ticket_csat')
    .select('ticket_id, score, created_at')
    .eq('tenant_id', session.profile.tenantId);
  return data ?? [];
}
