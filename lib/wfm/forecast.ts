import { addDays, eachDayOfInterval, format, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WfmAdherenceRow, WfmForecastBucket } from '@/lib/wfm/schema';
import { WEEKDAY_LABELS, isoDow, isWithinShift, zonedYmd } from '@/lib/wfm/time';

type TicketCreated = { created_at: string };
type RosterJoin = {
  user_id: string;
  group_id: string;
  work_date: string;
  wfm_shift_templates?: { start_local: string; end_local: string; timezone: string; name?: string } | Array<{
    start_local: string;
    end_local: string;
    timezone: string;
    name?: string;
  }> | null;
};
type PresenceRow = { user_id: string; status: WfmAdherenceRow['actual'] };
type ProfileRow = { id: string; full_name: string };
type GroupRow = { id: string; name: string };

function templateOf(row: RosterJoin) {
  const nested = row.wfm_shift_templates;
  return Array.isArray(nested) ? nested[0] : nested;
}

export async function computeForecast(
  client: SupabaseClient,
  tenantId: string,
  accountId: string | null,
): Promise<WfmForecastBucket[]> {
  const until = new Date();
  const since = addDays(until, -56);
  let ticketQuery = client
    .from('tickets')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString());
  if (accountId) ticketQuery = ticketQuery.eq('account_id', accountId);
  const { data: tickets } = await ticketQuery;

  const weekStart = startOfWeek(until, { weekStartsOn: 1 });
  const weekDates = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((day) =>
    format(day, 'yyyy-MM-dd'),
  );
  let rosterQuery = client
    .from('wfm_roster_entries')
    .select('user_id, group_id, work_date')
    .eq('tenant_id', tenantId)
    .in('work_date', weekDates);
  if (accountId) {
    const { data: groups } = await client.from('assignment_groups').select('id').eq('tenant_id', tenantId).eq('account_id', accountId);
    const ids = (groups ?? []).map((row) => row.id);
    rosterQuery = ids.length > 0 ? rosterQuery.in('group_id', ids) : rosterQuery.eq('group_id', '00000000-0000-0000-0000-000000000000');
  }
  const { data: roster } = await rosterQuery;

  const ticketCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const row of (tickets ?? []) as TicketCreated[]) {
    const dow = isoDow(new Date(row.created_at), 'Asia/Jakarta');
    ticketCounts[dow - 1] += 1;
  }
  const weeks = 8;
  const headcount = [0, 0, 0, 0, 0, 0, 0];
  const seen = new Set<string>();
  for (const row of roster ?? []) {
    const key = `${row.work_date}:${row.user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const date = new Date(`${row.work_date}T12:00:00+07:00`);
    const dow = isoDow(date, 'Asia/Jakarta');
    headcount[dow - 1] += 1;
  }

  return WEEKDAY_LABELS.map((label, index) => {
    const ticketsAvg = Math.round((ticketCounts[index] / weeks) * 10) / 10;
    const staff = headcount[index];
    return {
      weekday: index + 1,
      label,
      tickets: ticketsAvg,
      headcount: staff,
      gap: Math.round((ticketsAvg - staff) * 10) / 10,
    };
  });
}

export async function computeAdherence(
  client: SupabaseClient,
  tenantId: string,
  at = new Date(),
): Promise<WfmAdherenceRow[]> {
  const today = zonedYmd(at, 'Asia/Jakarta');
  const { data: roster } = await client
    .from('wfm_roster_entries')
    .select('user_id, group_id, work_date, wfm_shift_templates(start_local, end_local, timezone)')
    .eq('tenant_id', tenantId)
    .in('work_date', [today]);
  const covering = ((roster ?? []) as RosterJoin[]).filter((row) => {
    const template = templateOf(row);
    if (!template) return false;
    return isWithinShift(at, row.work_date, template.start_local, template.end_local, template.timezone);
  });
  if (covering.length === 0) return [];

  const userIds = Array.from(new Set(covering.map((row) => row.user_id)));
  const groupIds = Array.from(new Set(covering.map((row) => row.group_id)));
  const [{ data: presence }, { data: profiles }, { data: groups }] = await Promise.all([
    client.from('wfm_presence').select('user_id, status').eq('tenant_id', tenantId).in('user_id', userIds),
    client.from('profiles').select('id, full_name').in('id', userIds),
    client.from('assignment_groups').select('id, name').in('id', groupIds),
  ]);
  const presenceMap = new Map(((presence ?? []) as PresenceRow[]).map((row) => [row.user_id, row.status]));
  const names = new Map(((profiles ?? []) as ProfileRow[]).map((row) => [row.id, row.full_name]));
  const groupNames = new Map(((groups ?? []) as GroupRow[]).map((row) => [row.id, row.name]));

  return covering.map((row) => {
    const actual = presenceMap.get(row.user_id) ?? 'offline';
    const expected = true;
    const adherent = actual === 'available' || actual === 'busy';
    return {
      userId: row.user_id,
      fullName: names.get(row.user_id) ?? row.user_id.slice(0, 8),
      groupName: groupNames.get(row.group_id) ?? 'Group',
      expected,
      actual,
      adherent,
    };
  });
}
