import type { ReportSnapshot } from '@/lib/reports/schema';
import { formatDurationMinutes, formatReportPeriod, kpiLabels } from '@/lib/reports/labels';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #27272a;color:#fafafa;font-size:13px;text-align:right;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildReportDigestHtml(input: {
  tenantName: string;
  report: ReportSnapshot;
  reportsUrl: string;
  includeAging: boolean;
}) {
  const { report } = input;
  const kpis = [
    row(kpiLabels.open, String(report.kpis.open)),
    row(kpiLabels.unassigned, String(report.kpis.unassigned)),
    row(kpiLabels.slaBreached, String(report.kpis.slaBreached)),
    row(kpiLabels.slaRisk, String(report.kpis.slaRisk)),
    row(kpiLabels.frtMinutes, formatDurationMinutes(report.kpis.frtMinutes)),
    row(kpiLabels.mttrMinutes, formatDurationMinutes(report.kpis.mttrMinutes)),
    row(kpiLabels.backlogAging, String(report.kpis.backlogAging)),
    row(kpiLabels.csatAverage, report.kpis.csatCount ? String(report.kpis.csatAverage) : '—'),
  ].join('');

  const priority = report.byPriority
    .map((item) => row(item.label, String(item.value)))
    .join('');

  const aging =
    input.includeAging && report.aging.length > 0
      ? report.aging
          .slice(0, 8)
          .map((item) =>
            row(
              `${item.number || item.id.slice(0, 8)} · ${item.title}`,
              `${item.ageDays}d`,
            ),
          )
          .join('')
      : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#09090b;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:12px;">
            <tr>
              <td style="padding:24px 28px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#60a5fa;">NovaCRM · Daily report</td>
            </tr>
            <tr>
              <td style="padding:0 28px 4px;font-size:20px;font-weight:600;color:#fafafa;">${escapeHtml(input.tenantName)}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:13px;color:#a1a1aa;">${escapeHtml(formatReportPeriod(report))}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#71717a;">KPIs</td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${kpis}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#71717a;">Priority</td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${priority}</table>
              </td>
            </tr>
            ${
              aging
                ? `<tr><td style="padding:0 28px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#71717a;">Aging</td></tr>
                   <tr><td style="padding:0 28px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${aging}</table></td></tr>`
                : ''
            }
            <tr>
              <td style="padding:8px 28px 28px;">
                <a href="${escapeHtml(input.reportsUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 16px;border-radius:8px;">Open reports</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildReportDigestSubject(tenantName: string, report: ReportSnapshot) {
  return `${tenantName} daily report · ${formatReportPeriod(report)}`;
}
