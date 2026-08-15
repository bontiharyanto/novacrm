import type { NamedCount, ReportSnapshot, VendorScore } from '@/lib/reports/schema';
import { formatGeneratedAt, formatReportPeriod, kpiEntries } from '@/lib/reports/labels';

export type PreviewSheet = {
  name: string;
  columns: string[];
  rows: string[][];
};

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function countRows(section: string, rows: NamedCount[]) {
  return rows.map((row) => `${section},${csvEscape(row.id)},${csvEscape(row.label)},${row.value}`);
}

export function reportToCsv(report: ReportSnapshot) {
  return [
    'section,id,label,value',
    `meta,window,Window,${report.preset === 'custom' ? 'Custom' : `${report.rangeDays} days`}`,
    `meta,range,Range (days),${report.rangeDays}`,
    `meta,period,Period,${csvEscape(formatReportPeriod(report))}`,
    `meta,generated,Generated,${csvEscape(formatGeneratedAt(report.generatedAt))}`,
    ...kpiEntries(report).map(([label, value]) => `kpi,${csvEscape(label)},${csvEscape(label)},${value}`),
    ...countRows('type', report.byType),
    ...countRows('status', report.byStatus),
    ...countRows('priority', report.byPriority),
    ...countRows('assignee', report.assignees),
    ...countRows('group', report.byGroup),
    ...countRows('hold', report.byHoldReason),
    ...report.byVendor.map(
      (row) =>
        `vendor,${csvEscape(row.id)},${csvEscape(row.label)},${row.open}/${row.olaBreached}/${row.avgQueueMinutes}`,
    ),
    ...report.byUc.map(
      (row) =>
        `uc,${csvEscape(row.id)},${csvEscape(row.label)},${row.open}/${row.olaBreached}/${row.avgQueueMinutes}`,
    ),
    ...report.trend.map((row) => `trend,${row.day},Opened / closed,${row.opened}/${row.closed}`),
    ...report.aging.map(
      (row) =>
        `aging,${csvEscape(row.number)},${csvEscape(row.title)},${row.ageDays}`,
    ),
  ].join('\n');
}

function countSheet(name: string, rows: NamedCount[]): PreviewSheet {
  return {
    name,
    columns: ['ID', 'Label', 'Value'],
    rows: rows.map((row) => [row.id, row.label, String(row.value)]),
  };
}

function vendorSheet(name: string, rows: VendorScore[]): PreviewSheet {
  return {
    name,
    columns: ['ID', 'Label', 'Party', 'Contract', 'Open', 'OLA/UC breached', 'Avg queue (min)'],
    rows: rows.map((row) => [
      row.id,
      row.label,
      row.partyKind,
      row.contractName ?? '',
      String(row.open),
      String(row.olaBreached),
      String(row.avgQueueMinutes),
    ]),
  };
}

export function reportPreviewSheets(report: ReportSnapshot): PreviewSheet[] {
  return [
    {
      name: 'Summary',
      columns: ['Metric', 'Value'],
      rows: [
        ['Window', report.preset === 'custom' ? 'Custom' : `${report.rangeDays} days`],
        ['Range (days)', String(report.rangeDays)],
        ['Period', formatReportPeriod(report)],
        ['Generated', formatGeneratedAt(report.generatedAt)],
        ...kpiEntries(report).map(([label, value]) => [label, String(value)]),
      ],
    },
    countSheet('Process', report.byType),
    countSheet('Status', report.byStatus),
    countSheet('Priority', report.byPriority),
    countSheet('Assignees', report.assignees),
    countSheet('Groups', report.byGroup),
    countSheet('Hold', report.byHoldReason),
    vendorSheet('Vendors', report.byVendor),
    vendorSheet('UC', report.byUc),
    {
      name: 'Trend',
      columns: ['Day', 'Opened', 'Closed'],
      rows: report.trend.map((row) => [row.day, String(row.opened), String(row.closed)]),
    },
    {
      name: 'Aging',
      columns: ['Number', 'Title', 'Type', 'Status', 'Age (days)', 'Assignee'],
      rows: report.aging.map((row) => [
        row.number,
        row.title,
        row.type,
        row.status,
        String(row.ageDays),
        row.assigneeName ?? 'Unassigned',
      ]),
    },
  ];
}

export function reportCsvSheet(report: ReportSnapshot): PreviewSheet {
  const lines = reportToCsv(report).split('\n');
  const header = lines[0]?.split(',') ?? ['section', 'id', 'label', 'value'];
  return {
    name: 'CSV',
    columns: header,
    rows: lines.slice(1).map((line) => {
      const cells: string[] = [];
      let current = '';
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (quoted) {
          if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else if (char === '"') {
            quoted = false;
          } else {
            current += char;
          }
        } else if (char === '"') {
          quoted = true;
        } else if (char === ',') {
          cells.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current);
      return cells;
    }),
  };
}
