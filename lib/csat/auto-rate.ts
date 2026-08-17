import { addWorkingDays, OFFICE_HOURS, toCalendarConfig, type SlaCalendarConfig } from '@/lib/sla/calendar';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { CSAT_AUTO_SCORE, CSAT_AUTO_WORKING_DAYS } from '@/lib/csat/schema';

const AUTO_COMMENT = 'Auto-rated after 7 working days without a requester response.';

function defaultCalendar(): SlaCalendarConfig {
  return toCalendarConfig({
    timezone: 'Asia/Jakarta',
    is_24x7: false,
    business_hours: OFFICE_HOURS,
    holidays: [],
  });
}

export async function applyOverdueCsatRatings() {
  if (!hasServiceRole()) {
    return { ok: false, applied: 0, error: 'Service role is not configured' };
  }

  const supabase = createSupabaseAdminClient();
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, tenant_id, requester_id, sla_agreement_id, resolved_at, updated_at, status')
    .in('status', ['resolved', 'closed']);

  if (error) return { ok: false, applied: 0, error: error.message };
  if (!tickets?.length) return { ok: true, applied: 0, error: null };

  const ids = tickets.map((row) => row.id);
  const { data: ratings } = await supabase.from('ticket_csat').select('ticket_id').in('ticket_id', ids);
  const rated = new Set((ratings ?? []).map((row) => row.ticket_id));
  const pending = tickets.filter((row) => !rated.has(row.id));
  if (!pending.length) return { ok: true, applied: 0, error: null };

  const agreementIds = Array.from(
    new Set(pending.map((row) => row.sla_agreement_id).filter((id): id is string => Boolean(id))),
  );
  const calendarByAgreement = new Map<string, SlaCalendarConfig>();
  if (agreementIds.length) {
    const { data: agreements } = await supabase
      .from('sla_agreements')
      .select('id, calendar_id')
      .in('id', agreementIds);
    const calendarIds = Array.from(
      new Set((agreements ?? []).map((row) => row.calendar_id).filter((id): id is string => Boolean(id))),
    );
    const { data: calendars } = calendarIds.length
      ? await supabase
          .from('sla_calendars')
          .select('id, timezone, is_24x7, business_hours, holidays')
          .in('id', calendarIds)
      : { data: [] };
    const calendarById = new Map(
      (calendars ?? []).map((row) => [row.id as string, toCalendarConfig(row)]),
    );
    for (const agreement of agreements ?? []) {
      const calendar = agreement.calendar_id ? calendarById.get(agreement.calendar_id) : undefined;
      calendarByAgreement.set(agreement.id, calendar ?? defaultCalendar());
    }
  }

  const now = new Date();
  const due = pending.filter((row) => {
    const start = row.resolved_at || row.updated_at;
    if (!start) return false;
    const calendar = (row.sla_agreement_id && calendarByAgreement.get(row.sla_agreement_id)) || defaultCalendar();
    return addWorkingDays(new Date(start), CSAT_AUTO_WORKING_DAYS, calendar).getTime() <= now.getTime();
  });

  if (!due.length) return { ok: true, applied: 0, error: null };

  const { error: insertError } = await supabase.from('ticket_csat').insert(
    due.map((row) => ({
      tenant_id: row.tenant_id,
      ticket_id: row.id,
      score: CSAT_AUTO_SCORE,
      comment: AUTO_COMMENT,
      source: 'auto_timeout',
      created_by: null,
    })),
  );

  if (insertError) {
    if (insertError.code === '23505') return { ok: true, applied: 0, error: null };
    return { ok: false, applied: 0, error: insertError.message };
  }

  return { ok: true, applied: due.length, error: null };
}
