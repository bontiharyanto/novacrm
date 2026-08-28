'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildReportSnapshot } from '@/lib/reports/compute';
import { parseReportPeriod } from '@/lib/reports/period';
import type { ReportGroupMeta, ReportSnapshot } from '@/lib/reports/schema';
import { requireAccountId } from '@/lib/accounts/scope';
import { listCsatForReports } from '@/lib/csat/actions';
import { listUcCreditsForReports } from '@/lib/uc/credits';

export async function getReportSnapshot(input?: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<ReportSnapshot | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return null;
  }

  const period = parseReportPeriod(input ?? {});
  const scoped = await requireAccountId(session);
  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  let ticketQuery = supabase
    .from('tickets')
    .select('id, number, title, type, status, priority, due_date, sla_resolve_by, sla_paused_at, sla_resolve_minutes, created_at, updated_at, assignee_id, assignee_name, change_type, sla_responded_at, resolved_at, group_id, pending_reason, ola_resolve_by, ola_started_at, uc_id')
    .eq('tenant_id', tenantId);
  let assetQuery = supabase.from('assets').select('warranty_expiry').eq('tenant_id', tenantId);
  if (scoped.accountId) {
    ticketQuery = ticketQuery.eq('account_id', scoped.accountId);
    assetQuery = assetQuery.eq('account_id', scoped.accountId);
  }

  const [{ data: tickets }, { data: assets }, { count: catalogPublished }] = await Promise.all([
    ticketQuery,
    assetQuery,
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
      .in('id', groupIds)
      .eq('tenant_id', tenantId);
    const ucIds = Array.from(
      new Set((groups ?? []).map((row) => row.uc_id).filter((id): id is string => Boolean(id))),
    );
    const ucNames: Record<string, string> = {};
    if (ucIds.length > 0) {
      const { data: contracts } = await supabase
        .from('underpinning_contracts')
        .select('id, name')
        .in('id', ucIds)
        .eq('tenant_id', tenantId);
      for (const contract of contracts ?? []) {
        ucNames[contract.id] = contract.name;
      }
    }
    for (const group of groups ?? []) {
      groupMeta[group.id] = {
        name: group.name,
        partyKind: group.party_kind ?? 'internal',
        partyName: group.party_name ?? undefined,
        ucId: group.uc_id ?? null,
        ucName: group.uc_id ? ucNames[group.uc_id] : undefined,
      };
    }
  }

  const [csat, credits] = await Promise.all([listCsatForReports(), listUcCreditsForReports()]);
  return buildReportSnapshot(tickets ?? [], assets ?? [], catalogPublished ?? 0, period, groupMeta, {
    csat,
    credits,
  });
}
