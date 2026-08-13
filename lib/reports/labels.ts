import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ReportExportFormat, ReportKpis, ReportSnapshot } from '@/lib/reports/schema';

export const kpiLabels: Record<keyof ReportKpis, string> = {
  open: 'Open now',
  unassigned: 'Unassigned',
  slaBreached: 'SLA breached',
  slaRisk: 'SLA risk',
  cabReview: 'CAB review',
  emergencyChanges: 'Emergency changes',
  warrantySoon: 'Warranty risk',
  catalogPublished: 'Catalog live',
};

export const statusLabels: Record<string, string> = {
  open: 'New',
  in_progress: 'In progress',
  waiting: 'Waiting',
  hold: 'On hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const formatLabels: Record<ReportExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
};

export const statusOrder = ['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed'];
export const priorityOrder = ['critical', 'high', 'medium', 'low'];

export function formatReportPeriod(report: ReportSnapshot) {
  const start = format(parseISO(report.periodStart), 'd MMM', { locale: localeId });
  const end = format(parseISO(report.periodEnd), 'd MMM yyyy', { locale: localeId });
  return `${start} – ${end}`;
}

export function formatGeneratedAt(value: string) {
  return format(new Date(value), 'd MMM yyyy HH:mm', { locale: localeId });
}

export function kpiEntries(report: ReportSnapshot): Array<[string, number]> {
  return (Object.keys(kpiLabels) as Array<keyof ReportKpis>).map((key) => [kpiLabels[key], report.kpis[key]]);
}

export function openedInRange(report: ReportSnapshot) {
  return report.trend.reduce((sum, row) => sum + row.opened, 0);
}

export function closedInRange(report: ReportSnapshot) {
  return report.trend.reduce((sum, row) => sum + row.closed, 0);
}

export function exportFilename(report: ReportSnapshot, exportFormat: ReportExportFormat) {
  const from = report.periodStart.replace(/-/g, '');
  const to = report.periodEnd.replace(/-/g, '');
  return `novacrm-ops-${from}-${to}.${exportFormat === 'xlsx' ? 'xlsx' : exportFormat}`;
}
