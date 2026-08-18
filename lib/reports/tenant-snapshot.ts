import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { buildReportSnapshot } from '@/lib/reports/compute';
import { formatDay, parseReportPeriod, type ReportPeriod } from '@/lib/reports/period';
import type { ReportGroupMeta, ReportSnapshot } from '@/lib/reports/schema';
import { clockInZone } from '@/lib/reports/schedule-schema';

export function periodForSchedule(rangeDays: 1 | 7 | 30, timeZone: string): ReportPeriod {
  const { dateKey } = clockInZone(timeZone);
  const end = new Date(`${dateKey}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - (rangeDays === 1 ? 1 : rangeDays - 1));
  if (rangeDays === 1) {
    return parseReportPeriod({ from: formatDay(start), to: formatDay(start) });
  }
  return parseReportPeriod({ from: formatDay(start), to: formatDay(end) });
}

export async function getTenantReportSnapshot(tenantId: string, period: ReportPeriod): Promise<ReportSnapshot | null> {
  if (!hasServiceRole()) return null;
  const supabase = createSupabaseAdminClient();

  const [{ data: tickets }, { data: assets }, { count: catalogPublished }] = await Promise.all([
    supabase
      .from('tickets')
      .select(
        'id, number, title, type, status, priority, due_date, sla_resolve_by, sla_paused_at, sla_resolve_minutes, created_at, updated_at, assignee_id, assignee_name, change_type, sla_responded_at, resolved_at, group_id, pending_reason, ola_resolve_by, ola_started_at, uc_id',
      )
      .eq('tenant_id', tenantId),
    supabase.from('assets').select('warranty_expiry').eq('tenant_id', tenantId),
    supabase
      .from('catalog_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ]);

  const groupIds = Array.from(
    new Set((tickets ?? []).map((row) => row.group_id).filter((id): id is string => Boolean(id))),
  );
  const groupMeta: Record<string, ReportGroupMeta> = {};
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('assignment_groups')
      .select('id, name, party_kind, party_name, uc_id')
      .in('id', groupIds);
    for (const group of groups ?? []) {
      groupMeta[group.id] = {
        name: group.name,
        partyKind: group.party_kind ?? 'internal',
        partyName: group.party_name ?? undefined,
        ucId: group.uc_id ?? null,
      };
    }
  }

  const { data: csat } = await supabase.from('ticket_csat').select('ticket_id, score').eq('tenant_id', tenantId);

  return buildReportSnapshot(tickets ?? [], assets ?? [], catalogPublished ?? 0, period, groupMeta, {
    csat: csat ?? [],
  });
}
