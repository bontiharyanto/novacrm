'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildReportSnapshot } from '@/lib/reports/compute';
import { parseReportPeriod } from '@/lib/reports/period';
import type { ReportSnapshot } from '@/lib/reports/schema';
import { requireAccountId } from '@/lib/accounts/scope';

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
  if (!scoped.accountId) return null;

  const supabase = await createSupabaseServerClient();
  const tenantId = session.profile.tenantId;

  const [{ data: tickets }, { data: assets }, { count: catalogPublished }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, number, title, type, status, priority, due_date, sla_resolve_by, sla_paused_at, sla_resolve_minutes, created_at, updated_at, assignee_id, assignee_name, change_type')
      .eq('tenant_id', tenantId)
      .eq('account_id', scoped.accountId),
    supabase.from('assets').select('warranty_expiry').eq('tenant_id', tenantId).eq('account_id', scoped.accountId),
    supabase
      .from('catalog_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ]);

  return buildReportSnapshot(tickets ?? [], assets ?? [], catalogPublished ?? 0, period);
}
