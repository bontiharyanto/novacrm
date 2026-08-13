'use server';

import { revalidatePath } from 'next/cache';
import { OFFICE_HOURS } from '@/lib/sla/calendar';
import { slaAgreementUpdateSchema, type SlaAgreement, type SlaCalendar, type SlaTarget } from '@/lib/sla/schema';
import { requireAccountId } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TICKET_TYPES } from '@/lib/tickets/process';
import type { TicketPriority } from '@/lib/tickets/schema';

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

type CalendarRow = {
  id: string;
  tenant_id: string;
  account_id?: string | null;
  name: string;
  timezone: string;
  is_24x7: boolean;
  business_hours: SlaCalendar['businessHours'] | null;
  holidays: Array<{ date?: string; name?: string }> | string[] | null;
};

type AgreementRow = {
  id: string;
  tenant_id: string;
  account_id: string;
  calendar_id: string;
  name: string;
  pause_on_waiting: boolean;
  is_active: boolean;
  created_at: string;
};

type TargetRow = {
  id: string;
  ticket_type: SlaTarget['ticketType'];
  priority: SlaTarget['priority'];
  response_minutes: number;
  resolve_minutes: number;
};

function mapCalendar(row: CalendarRow): SlaCalendar {
  const holidays = (row.holidays ?? []).map((item) =>
    typeof item === 'string' ? { date: item, name: '' } : { date: item.date ?? '', name: item.name ?? '' },
  );
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id ?? undefined,
    name: row.name,
    timezone: row.timezone,
    is24x7: row.is_24x7,
    businessHours: row.business_hours ?? OFFICE_HOURS,
    holidays: holidays.filter((item) => item.date),
  };
}

function mapTarget(row: TargetRow): SlaTarget {
  return {
    id: row.id,
    ticketType: row.ticket_type,
    priority: row.priority,
    responseMinutes: row.response_minutes,
    resolveMinutes: row.resolve_minutes,
  };
}

function defaultTargets(): Array<{ ticketType: SlaTarget['ticketType']; priority: SlaTarget['priority']; responseMinutes: number; resolveMinutes: number }> {
  const pack: Record<SlaTarget['ticketType'], Record<SlaTarget['priority'], [number, number]>> = {
    incident: { critical: [30, 240], high: [60, 480], medium: [240, 1440], low: [480, 2880] },
    problem: { critical: [60, 480], high: [120, 960], medium: [480, 2880], low: [960, 5760] },
    change: { critical: [120, 480], high: [240, 1440], medium: [480, 2880], low: [960, 5760] },
    request: { critical: [60, 480], high: [120, 960], medium: [240, 2880], low: [480, 5760] },
  };
  return TICKET_TYPES.flatMap((ticketType) =>
    PRIORITIES.map((priority) => ({
      ticketType,
      priority,
      responseMinutes: pack[ticketType][priority][0],
      resolveMinutes: pack[ticketType][priority][1],
    })),
  );
}

async function hydrateAgreement(row: AgreementRow): Promise<SlaAgreement | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: calendar }, { data: targets }] = await Promise.all([
    supabase.from('sla_calendars').select('*').eq('id', row.calendar_id).maybeSingle(),
    supabase
      .from('sla_targets')
      .select('id, ticket_type, priority, response_minutes, resolve_minutes')
      .eq('agreement_id', row.id),
  ]);
  if (!calendar) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    calendarId: row.calendar_id,
    name: row.name,
    pauseOnWaiting: row.pause_on_waiting,
    isActive: row.is_active,
    calendar: mapCalendar(calendar as CalendarRow),
    targets: (targets ?? []).map((item) => mapTarget(item as TargetRow)),
    createdAt: row.created_at,
  };
}

export async function getAccountSlaAgreement(): Promise<SlaAgreement | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) return null;
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('sla_agreements')
    .select('id, tenant_id, account_id, calendar_id, name, pause_on_waiting, is_active, created_at')
    .eq('tenant_id', session.profile.tenantId)
    .eq('account_id', scoped.accountId)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;
  return hydrateAgreement(data as AgreementRow);
}

export async function ensureSlaAgreement(): Promise<{ data: SlaAgreement | null; error: string | null }> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Sla')) {
    return { data: null, error: 'Unauthorized' };
  }
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return { data: null, error: scoped.error ?? 'Select an account' };

  const existing = await getAccountSlaAgreement();
  if (existing) return { data: existing, error: null };

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;
  const accountId = scoped.accountId;

  const { data: shared } = await supabase
    .from('sla_calendars')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('account_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let calendarId = shared?.id as string | undefined;
  if (!calendarId) {
    const { data: created, error: calendarError } = await supabase
      .from('sla_calendars')
      .insert({
        tenant_id: tenantId,
        account_id: accountId,
        name: 'Office hours',
        timezone: 'Asia/Jakarta',
        is_24x7: false,
        business_hours: OFFICE_HOURS,
        holidays: [
          { date: '2026-01-01', name: 'Tahun Baru' },
          { date: '2026-08-17', name: 'Hari Kemerdekaan' },
          { date: '2026-12-25', name: 'Natal' },
        ],
        created_by: session.userId,
      })
      .select('id')
      .single();
    if (calendarError || !created) {
      return { data: null, error: calendarError?.message ?? 'Unable to create calendar' };
    }
    calendarId = created.id;
  }

  const { data: agreement, error } = await supabase
    .from('sla_agreements')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      calendar_id: calendarId,
      name: 'Standard',
      pause_on_waiting: true,
      is_active: true,
      created_by: session.userId,
    })
    .select('id, tenant_id, account_id, calendar_id, name, pause_on_waiting, is_active, created_at')
    .single();

  if (error || !agreement) {
    return { data: null, error: error?.message ?? 'Unable to create agreement' };
  }

  const { error: targetError } = await supabase.from('sla_targets').insert(
    defaultTargets().map((target) => ({
      tenant_id: tenantId,
      agreement_id: agreement.id,
      ticket_type: target.ticketType,
      priority: target.priority,
      response_minutes: target.responseMinutes,
      resolve_minutes: target.resolveMinutes,
      created_by: session.userId,
    })),
  );

  if (targetError) {
    return { data: null, error: targetError.message };
  }

  revalidatePath('/sla');
  const hydrated = await hydrateAgreement(agreement as AgreementRow);
  return { data: hydrated, error: hydrated ? null : 'Unable to load agreement' };
}

export async function updateSlaAgreement(input: unknown): Promise<{ data: SlaAgreement | null; error: string | null }> {
  const parsed = slaAgreementUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Sla')) {
    return { data: null, error: 'Unauthorized' };
  }
  const scoped = await requireAccountId(session);
  if (!scoped.accountId) return { data: null, error: scoped.error ?? 'Select an account' };

  const current = await getAccountSlaAgreement();
  if (!current) return { data: null, error: 'No SLA agreement' };

  const supabase = await createSupabaseServerClient();

  if (parsed.calendar) {
    const hours = parsed.calendar.businessHours ?? current.calendar.businessHours;
    const calendarPayload = {
      name: parsed.calendar.name,
      timezone: parsed.calendar.timezone,
      is_24x7: parsed.calendar.is24x7,
      business_hours: hours,
      holidays: parsed.calendar.holidays ?? [],
    };

    if (!current.calendar.accountId) {
      const { data: cloned, error: cloneError } = await supabase
        .from('sla_calendars')
        .insert({
          tenant_id: session.profile.tenantId,
          account_id: scoped.accountId,
          created_by: session.userId,
          ...calendarPayload,
          name: `${parsed.calendar.name} · ${current.name}`,
        })
        .select('id')
        .single();
      if (cloneError || !cloned) return { data: null, error: cloneError?.message ?? 'Unable to clone calendar' };
      const { error: pointError } = await supabase
        .from('sla_agreements')
        .update({ calendar_id: cloned.id })
        .eq('id', current.id)
        .eq('tenant_id', session.profile.tenantId);
      if (pointError) return { data: null, error: pointError.message };
    } else {
      const { error: calendarError } = await supabase
        .from('sla_calendars')
        .update(calendarPayload)
        .eq('id', current.calendarId)
        .eq('tenant_id', session.profile.tenantId);
      if (calendarError) return { data: null, error: calendarError.message };
    }
  }

  const { error: agreementError } = await supabase
    .from('sla_agreements')
    .update({
      name: parsed.name ?? current.name,
      pause_on_waiting: parsed.pauseOnWaiting ?? current.pauseOnWaiting,
      is_active: parsed.isActive ?? current.isActive,
    })
    .eq('id', current.id)
    .eq('tenant_id', session.profile.tenantId);
  if (agreementError) return { data: null, error: agreementError.message };

  if (parsed.targets) {
    for (const target of parsed.targets) {
      const { error: targetError } = await supabase
        .from('sla_targets')
        .upsert(
          {
            tenant_id: session.profile.tenantId,
            agreement_id: current.id,
            ticket_type: target.ticketType,
            priority: target.priority,
            response_minutes: target.responseMinutes,
            resolve_minutes: target.resolveMinutes,
            created_by: session.userId,
          },
          { onConflict: 'agreement_id,ticket_type,priority' },
        );
      if (targetError) return { data: null, error: targetError.message };
    }
  }

  revalidatePath('/sla');
  const next = await getAccountSlaAgreement();
  return { data: next, error: next ? null : 'Unable to reload agreement' };
}
