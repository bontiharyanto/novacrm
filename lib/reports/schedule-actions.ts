'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';
import { enqueueReportDigest } from '@/lib/queue/report.queue';
import {
  emptyReportSchedule,
  parseReportRecipients,
  reportScheduleSchema,
  type ReportSchedule,
} from '@/lib/reports/schedule-schema';

function mapRow(row: {
  id: string;
  is_active: boolean;
  recipients: string;
  range_days: number;
  send_hour: number;
  timezone: string;
  include_aging: boolean;
  last_sent_on?: string | null;
  last_sent_at?: string | null;
  last_ok?: boolean | null;
  last_error?: string | null;
}): ReportSchedule {
  return {
    id: row.id,
    isActive: row.is_active,
    recipients: row.recipients ?? '',
    rangeDays: row.range_days === 1 || row.range_days === 30 ? row.range_days : 7,
    sendHour: row.send_hour,
    timezone: row.timezone || 'Asia/Jakarta',
    includeAging: row.include_aging !== false,
    lastSentOn: row.last_sent_on ?? null,
    lastSentAt: row.last_sent_at ?? null,
    lastOk: row.last_ok ?? null,
    lastError: row.last_error ?? null,
  };
}

export async function getReportSchedule(): Promise<ReportSchedule> {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) return emptyReportSchedule();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('report_schedules')
    .select(
      'id, is_active, recipients, range_days, send_hour, timezone, include_aging, last_sent_on, last_sent_at, last_ok, last_error',
    )
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  return data ? mapRow(data) : emptyReportSchedule();
}

export async function saveReportSchedule(input: unknown) {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = reportScheduleSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };

  const recipients = parseReportRecipients(parsed.data.recipients);
  if (parsed.data.isActive && recipients.length === 0) {
    return { data: null, error: 'Add at least one valid email before enabling the daily send.' };
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    tenant_id: session.profile.tenantId,
    is_active: parsed.data.isActive,
    recipients: recipients.join(', '),
    range_days: parsed.data.rangeDays,
    send_hour: parsed.data.sendHour,
    timezone: parsed.data.timezone || 'Asia/Jakarta',
    include_aging: parsed.data.includeAging,
    created_by: session.userId,
  };
  const { data, error } = await supabase
    .from('report_schedules')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select(
      'id, is_active, recipients, range_days, send_hour, timezone, include_aging, last_sent_on, last_sent_at, last_ok, last_error',
    )
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? 'Unable to save schedule' };
  return { data: mapRow(data), error: null };
}

export async function sendReportScheduleNow() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }
  const current = await getReportSchedule();
  if (parseReportRecipients(current.recipients).length === 0) {
    return { data: null, error: 'Save at least one recipient first.' };
  }
  const result = await enqueueReportDigest({ tenantId: session.profile.tenantId, force: true });
  if (!result.ok) return { data: null, error: result.error ?? 'Unable to send test' };
  return {
    data: { queued: result.queued, sent: 'sent' in result ? result.sent : undefined },
    error: null,
  };
}
