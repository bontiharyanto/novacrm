'use server';

import { cabDecisionInputSchema, changePlanSchema, type CabApproval } from '@/lib/cab/schema';
import { changeReadyForCab, nextStatusForDecision, submitStatusForChange } from '@/lib/cab/flow';
import { recordTicketAudit } from '@/lib/tickets/audit';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTicketById, listTickets, updateTicket } from '@/lib/tickets/actions';
import { sanitizeCommentHtml } from '@/lib/sanitize/html';

type ApprovalRow = {
  id: string;
  ticket_id: string;
  approver_id: string;
  approver_name?: string | null;
  decision: CabApproval['decision'];
  comment?: string | null;
  created_at: string;
};

function mapApproval(row: ApprovalRow): CabApproval {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    approverId: row.approver_id,
    approverName: row.approver_name ?? undefined,
    decision: row.decision,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listChanges() {
  if (!(await canAccessConfiguredCapability('read', 'OperationsCab'))) return [];
  const tickets = await listTickets();
  return tickets.filter((ticket) => ticket.type === 'change');
}

export async function getChangeRecord(ticketId: string) {
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('read', 'OperationsCab'))) {
    return { ticket: null, approvals: [] as CabApproval[] };
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.type !== 'change') {
    return { ticket: null, approvals: [] as CabApproval[] };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cab_approvals')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  return {
    ticket,
    approvals: (data ?? []).map((row) => mapApproval(row as ApprovalRow)),
  };
}

export async function saveChangePlan(ticketId: string, input: unknown) {
  const parsed = changePlanSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('update', 'OperationsCab'))) {
    return { data: null, error: 'Unauthorized' };
  }

  const existing = await getTicketById(ticketId);
  if (!existing || existing.type !== 'change') {
    return { data: null, error: 'Change not found' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tickets')
    .update({
      change_type: parsed.changeType ?? existing.changeType ?? 'normal',
      risk_level: parsed.riskLevel ?? existing.riskLevel ?? existing.priority,
      planned_start: parsed.plannedStart === undefined ? existing.plannedStart ?? null : parsed.plannedStart,
      planned_end: parsed.plannedEnd === undefined ? existing.plannedEnd ?? null : parsed.plannedEnd,
      implementation_plan: parsed.implementationPlan
        ? sanitizeCommentHtml(parsed.implementationPlan)
        : (existing.implementationPlan ?? null),
      backout_plan: parsed.backoutPlan
        ? sanitizeCommentHtml(parsed.backoutPlan)
        : (existing.backoutPlan ?? null),
    })
    .eq('id', ticketId)
    .eq('tenant_id', session.profile.tenantId)
    .select('id')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to save change plan' };
  }

  return getChangeRecord(ticketId).then((record) => ({ data: record, error: null }));
}

export async function submitChangeToCab(ticketId: string) {
  if (!(await canAccessConfiguredCapability('update', 'OperationsCab'))) {
    return { data: null, error: 'Unauthorized' };
  }
  const existing = await getTicketById(ticketId);
  if (!existing || existing.type !== 'change') {
    return { data: null, error: 'Change not found' };
  }
  const ready = changeReadyForCab(existing);
  if (!ready.ok) {
    return { data: null, error: `Save risk and plans first: ${ready.missing.join(', ')}` };
  }
  const status = submitStatusForChange(existing.changeType);
  const result = await updateTicket(ticketId, { status });
  if (result.error) return result;
  return getChangeRecord(ticketId).then((record) => ({ data: record, error: null }));
}

export async function decideCab(ticketId: string, input: unknown) {
  const parsed = cabDecisionInputSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('update', 'OperationsCab'))) {
    return { data: null, error: 'Unauthorized' };
  }

  const existing = await getTicketById(ticketId);
  if (!existing || existing.type !== 'change') {
    return { data: null, error: 'Change not found' };
  }

  if (parsed.decision === 'approved') {
    const ready = changeReadyForCab(existing);
    if (!ready.ok) {
      return { data: null, error: `Cannot approve without ${ready.missing.join(', ')}` };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('cab_approvals').upsert(
    {
      tenant_id: session.profile.tenantId,
      ticket_id: ticketId,
      approver_id: session.userId,
      approver_name: session.profile.fullName,
      decision: parsed.decision,
      comment: parsed.comment ?? null,
      created_by: session.userId,
    },
    { onConflict: 'ticket_id,approver_id' },
  );

  if (error) {
    return { data: null, error: error.message };
  }

  await supabase.from('ticket_comments').insert({
    tenant_id: session.profile.tenantId,
    ticket_id: ticketId,
    author_id: session.userId,
    created_by: session.userId,
    message: `CAB ${parsed.decision}${parsed.comment ? `: ${parsed.comment}` : ''}`,
  });

  await recordTicketAudit(supabase, {
    tenantId: session.profile.tenantId,
    ticketId,
    actorId: session.userId,
    actorName: session.profile.fullName,
    action: 'cab',
    field: 'decision',
    newValue: parsed.decision,
  });

  const nextStatus = nextStatusForDecision(parsed.decision, existing.changeType);
  if (nextStatus && nextStatus !== existing.status) {
    const updated = await updateTicket(ticketId, { status: nextStatus });
    if (updated.error) return updated;
  }

  return getChangeRecord(ticketId).then((record) => ({ data: record, error: null }));
}

export async function listChangeApprovals(ticketId: string) {
  const { approvals } = await getChangeRecord(ticketId);
  return approvals;
}
