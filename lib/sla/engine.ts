import type { SupabaseClient } from '@supabase/supabase-js';
import { addBusinessMinutes, remainingBusinessMinutes, toCalendarConfig, type SlaCalendarConfig } from '@/lib/sla/calendar';
import type { TicketPriority, TicketStatus, TicketType } from '@/lib/tickets/schema';

export const PAUSE_STATUSES: TicketStatus[] = ['waiting', 'hold'];

type AgreementRow = {
  id: string;
  account_id: string;
  pause_on_waiting: boolean;
  calendar_id: string;
};

type CalendarRow = {
  timezone?: string | null;
  is_24x7?: boolean | null;
  business_hours?: SlaCalendarConfig['businessHours'] | null;
  holidays?: Array<{ date?: string } | string> | null;
};

type TargetRow = {
  response_minutes: number;
  resolve_minutes: number;
};

export type SlaSnapshot = {
  sla_agreement_id: string | null;
  sla_response_minutes: number | null;
  sla_resolve_minutes: number | null;
  sla_response_at: string | null;
  sla_resolve_by: string | null;
  sla_responded_at: string | null;
  sla_paused_at: string | null;
  due_date: string;
};

export type TicketSlaState = {
  accountId: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  slaAgreementId?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  dueDate?: string;
};

function fallbackDue(priority: TicketPriority, from: Date) {
  const hours = { low: 72, medium: 24, high: 8, critical: 4 }[priority];
  return new Date(from.getTime() + hours * 3600_000).toISOString();
}

async function loadAgreementForAccount(client: SupabaseClient, tenantId: string, accountId: string) {
  const { data: own } = await client
    .from('sla_agreements')
    .select('id, account_id, pause_on_waiting, calendar_id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('is_active', true)
    .maybeSingle();

  if (own) return own as AgreementRow;

  const { data: internal } = await client
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'internal')
    .maybeSingle();

  if (!internal || internal.id === accountId) return null;

  const { data: fallback } = await client
    .from('sla_agreements')
    .select('id, account_id, pause_on_waiting, calendar_id')
    .eq('tenant_id', tenantId)
    .eq('account_id', internal.id)
    .eq('is_active', true)
    .maybeSingle();

  return (fallback as AgreementRow | null) ?? null;
}

async function loadCalendar(client: SupabaseClient, calendarId: string) {
  const { data } = await client
    .from('sla_calendars')
    .select('timezone, is_24x7, business_hours, holidays')
    .eq('id', calendarId)
    .maybeSingle();
  if (!data) return toCalendarConfig({ timezone: 'Asia/Jakarta', is_24x7: false, business_hours: null, holidays: [] });
  return toCalendarConfig(data as CalendarRow);
}

async function loadTarget(
  client: SupabaseClient,
  agreementId: string,
  type: TicketType,
  priority: TicketPriority,
) {
  const { data } = await client
    .from('sla_targets')
    .select('response_minutes, resolve_minutes')
    .eq('agreement_id', agreementId)
    .eq('ticket_type', type)
    .eq('priority', priority)
    .maybeSingle();
  return (data as TargetRow | null) ?? null;
}

export async function snapshotSla(
  client: SupabaseClient,
  input: {
    tenantId: string;
    accountId: string;
    type: TicketType;
    priority: TicketPriority;
    status: TicketStatus;
    createdAt?: Date;
    assigned?: boolean;
    dueDateOverride?: string;
  },
): Promise<SlaSnapshot> {
  const createdAt = input.createdAt ?? new Date();
  const agreement = await loadAgreementForAccount(client, input.tenantId, input.accountId);
  if (!agreement) {
    const due = input.dueDateOverride || fallbackDue(input.priority, createdAt);
    return {
      sla_agreement_id: null,
      sla_response_minutes: null,
      sla_resolve_minutes: null,
      sla_response_at: null,
      sla_resolve_by: due,
      sla_responded_at: input.assigned ? createdAt.toISOString() : null,
      sla_paused_at: PAUSE_STATUSES.includes(input.status) ? createdAt.toISOString() : null,
      due_date: due,
    };
  }

  const bindAgreement = agreement.account_id === input.accountId;
  const [calendar, target] = await Promise.all([
    loadCalendar(client, agreement.calendar_id),
    loadTarget(client, agreement.id, input.type, input.priority),
  ]);

  if (!target) {
    const due = input.dueDateOverride || fallbackDue(input.priority, createdAt);
    return {
      sla_agreement_id: bindAgreement ? agreement.id : null,
      sla_response_minutes: null,
      sla_resolve_minutes: null,
      sla_response_at: null,
      sla_resolve_by: due,
      sla_responded_at: input.assigned ? createdAt.toISOString() : null,
      sla_paused_at: PAUSE_STATUSES.includes(input.status) && agreement.pause_on_waiting ? createdAt.toISOString() : null,
      due_date: due,
    };
  }

  const responseAt = addBusinessMinutes(createdAt, target.response_minutes, calendar);
  const resolveBy = input.dueDateOverride
    ? new Date(input.dueDateOverride)
    : addBusinessMinutes(createdAt, target.resolve_minutes, calendar);
  const paused =
    PAUSE_STATUSES.includes(input.status) && agreement.pause_on_waiting ? createdAt.toISOString() : null;

  return {
    sla_agreement_id: bindAgreement ? agreement.id : null,
    sla_response_minutes: target.response_minutes,
    sla_resolve_minutes: target.resolve_minutes,
    sla_response_at: responseAt.toISOString(),
    sla_resolve_by: resolveBy.toISOString(),
    sla_responded_at: input.assigned ? createdAt.toISOString() : null,
    sla_paused_at: paused,
    due_date: resolveBy.toISOString(),
  };
}

export async function applyTicketSlaChange(
  client: SupabaseClient,
  ticket: TicketSlaState,
  patch: {
    status?: TicketStatus;
    assigneeId?: string | null;
    staffResponded?: boolean;
  },
  now = new Date(),
): Promise<Partial<SlaSnapshot>> {
  const nextStatus = patch.status ?? ticket.status;
  const updates: Partial<SlaSnapshot> = {};

  if (!ticket.slaRespondedAt && (patch.assigneeId || patch.staffResponded)) {
    updates.sla_responded_at = now.toISOString();
  }

  if (!ticket.slaAgreementId || !ticket.slaResolveBy) {
    return updates;
  }

  const { data: agreement } = await client
    .from('sla_agreements')
    .select('pause_on_waiting, calendar_id')
    .eq('id', ticket.slaAgreementId)
    .maybeSingle();

  if (!agreement) return updates;

  const wasPaused = Boolean(ticket.slaPausedAt);
  const shouldPause = Boolean(agreement.pause_on_waiting) && PAUSE_STATUSES.includes(nextStatus);

  if (!wasPaused && shouldPause) {
    updates.sla_paused_at = now.toISOString();
    return updates;
  }

  if (wasPaused && !shouldPause && ticket.slaPausedAt) {
    const calendar = await loadCalendar(client, agreement.calendar_id as string);
    const pausedAt = new Date(ticket.slaPausedAt);
    const remainingResolve = remainingBusinessMinutes(pausedAt, new Date(ticket.slaResolveBy), calendar);
    updates.sla_resolve_by = addBusinessMinutes(now, remainingResolve, calendar).toISOString();
    if (ticket.slaResponseAt && !ticket.slaRespondedAt) {
      const remainingResponse = remainingBusinessMinutes(pausedAt, new Date(ticket.slaResponseAt), calendar);
      updates.sla_response_at = addBusinessMinutes(now, remainingResponse, calendar).toISOString();
    }
    updates.sla_paused_at = null;
    updates.due_date = updates.sla_resolve_by;
    return updates;
  }

  return updates;
}
