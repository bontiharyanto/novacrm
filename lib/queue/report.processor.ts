import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/integrations/email';
import { getSmtpConfigForTenant } from '@/lib/settings/integrations';
import { appendNotificationLog } from '@/lib/notifications/logs';
import { loadTenantPublicUrl } from '@/lib/notifications/public-url';
import { buildReportDigestHtml, buildReportDigestSubject } from '@/lib/reports/digest-email';
import { clockInZone, parseReportRecipients } from '@/lib/reports/schedule-schema';
import { getTenantReportSnapshot, periodForSchedule } from '@/lib/reports/tenant-snapshot';

export type ReportDigestJob = {
  tenantId?: string;
  force?: boolean;
};

type ScheduleRow = {
  id: string;
  tenant_id: string;
  is_active: boolean;
  recipients: string;
  range_days: 1 | 7 | 30;
  send_hour: number;
  timezone: string;
  include_aging: boolean;
  last_sent_on?: string | null;
};

async function markSchedule(
  id: string,
  patch: { last_sent_on?: string; last_sent_at?: string; last_ok: boolean; last_error: string | null },
) {
  const supabase = createSupabaseAdminClient();
  await supabase.from('report_schedules').update(patch).eq('id', id);
}

async function sendOne(row: ScheduleRow, force: boolean) {
  const clock = clockInZone(row.timezone || 'Asia/Jakarta');
  if (!force) {
    if (!row.is_active) return { sent: 0, skipped: true };
    if (clock.hour < row.send_hour) return { sent: 0, skipped: true };
    if (row.last_sent_on === clock.dateKey) return { sent: 0, skipped: true };
  }

  const recipients = parseReportRecipients(row.recipients);
  if (recipients.length === 0) {
    await markSchedule(row.id, {
      last_ok: false,
      last_error: 'No valid recipient emails.',
    });
    return { sent: 0, skipped: false, error: 'No recipients' };
  }

  const period = periodForSchedule(row.range_days, row.timezone);
  const report = await getTenantReportSnapshot(row.tenant_id, period);
  if (!report) {
    await markSchedule(row.id, { last_ok: false, last_error: 'Unable to build report snapshot.' });
    return { sent: 0, skipped: false, error: 'No snapshot' };
  }

  const supabase = createSupabaseAdminClient();
  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', row.tenant_id).maybeSingle();
  const tenantName = tenant?.name || 'NovaCRM';
  const publicUrl = (await loadTenantPublicUrl(row.tenant_id)).replace(/\/$/, '');
  const reportsUrl = publicUrl ? `${publicUrl}/reports` : '/reports';
  const subject = buildReportDigestSubject(tenantName, report);
  const html = buildReportDigestHtml({
    tenantName,
    report,
    reportsUrl,
    includeAging: row.include_aging,
  });

  const { data: channel } = await supabase
    .from('notification_channels')
    .select('config')
    .eq('tenant_id', row.tenant_id)
    .eq('type', 'email')
    .maybeSingle();
  const smtp = await getSmtpConfigForTenant(row.tenant_id);
  const config = (channel?.config ?? {}) as { apiKey?: string; from?: string };

  let sent = 0;
  let lastError: string | null = null;
  for (const recipient of recipients) {
    const result = await sendEmail(recipient, subject, html, {
      apiKey: config.apiKey || process.env.RESEND_API_KEY,
      from: config.from || smtp?.from || process.env.EMAIL_FROM,
      smtp,
    });
    await appendNotificationLog({
      tenantId: row.tenant_id,
      channel: 'email',
      recipient,
      subject: result.dryRun ? `[DEV] ${subject}` : subject,
      body: html,
      status: result.ok ? (result.dryRun ? 'queued' : 'sent') : 'failed',
    });
    if (result.ok) sent += 1;
    else lastError = result.error ?? 'Email send failed';
  }

  await markSchedule(row.id, {
    last_sent_on: clock.dateKey,
    last_sent_at: new Date().toISOString(),
    last_ok: sent > 0,
    last_error: sent > 0 ? null : lastError,
  });

  return { sent, skipped: false, error: sent > 0 ? null : lastError };
}

export async function processReportDigestJob(payload: ReportDigestJob = {}) {
  if (!hasServiceRole()) {
    return { ok: false, sent: 0, error: 'Service role is required' };
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase.from('report_schedules').select(
    'id, tenant_id, is_active, recipients, range_days, send_hour, timezone, include_aging, last_sent_on',
  );
  if (payload.tenantId) query = query.eq('tenant_id', payload.tenantId);
  else query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return { ok: false, sent: 0, error: error.message };

  let sent = 0;
  for (const row of (data ?? []) as ScheduleRow[]) {
    const result = await sendOne(row, Boolean(payload.force && payload.tenantId));
    sent += result.sent;
  }

  return { ok: true, sent, error: null };
}
