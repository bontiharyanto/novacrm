import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { NamedCount, ReportExportFormat, ReportSnapshot, VendorScore } from '@/lib/reports/schema';
import { reportToCsv } from '@/lib/reports/preview';
import {
  exportFilename,
  formatGeneratedAt,
  formatReportPeriod,
  kpiEntries,
} from '@/lib/reports/labels';

export { reportToCsv, exportFilename };

const HEADER_BLUE = 'FF2563EB';
const ZEBRA = 'FFF4F4F5';
const PAGE_WIDTH = 595.28;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BLUE } };
  row.alignment = { vertical: 'middle' };
  row.height = 20;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
}

function zebraRows(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    }
  });
}

export async function reportToXlsx(report: ReportSnapshot) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NovaCRM';
  workbook.company = 'NovaCRM';
  workbook.created = new Date(report.generatedAt);
  workbook.modified = new Date(report.generatedAt);

  function addCountSheet(name: string, rows: NamedCount[]) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'ID', key: 'id', width: 18 },
      { header: 'Label', key: 'label', width: 28 },
      { header: 'Value', key: 'value', width: 12, style: { numFmt: '#,##0' } },
    ];
    rows.forEach((row) => sheet.addRow(row));
    styleHeader(sheet);
    zebraRows(sheet);
  }

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'label', width: 28 },
    { header: 'Value', key: 'value', width: 28 },
  ];
  summary.addRow({ label: 'Window', value: report.preset === 'custom' ? 'Custom' : `${report.rangeDays} days` });
  summary.addRow({ label: 'Range (days)', value: report.rangeDays });
  summary.addRow({ label: 'Period', value: formatReportPeriod(report) });
  summary.addRow({ label: 'Generated', value: formatGeneratedAt(report.generatedAt) });
  kpiEntries(report).forEach(([label, value]) => summary.addRow({ label, value }));
  styleHeader(summary);
  zebraRows(summary);

  addCountSheet('Process', report.byType);
  addCountSheet('Status', report.byStatus);
  addCountSheet('Priority', report.byPriority);
  addCountSheet('Assignees', report.assignees);
  addCountSheet('Groups', report.byGroup);
  addCountSheet('Hold', report.byHoldReason);

  function addVendorSheet(name: string, rows: VendorScore[]) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Label', key: 'label', width: 28 },
      { header: 'Party', key: 'partyKind', width: 12 },
      { header: 'Contract', key: 'contractName', width: 28 },
      { header: 'Open', key: 'open', width: 10, style: { numFmt: '#,##0' } },
      { header: 'OLA/UC breached', key: 'olaBreached', width: 16, style: { numFmt: '#,##0' } },
      { header: 'Avg queue (min)', key: 'avgQueueMinutes', width: 16, style: { numFmt: '#,##0' } },
      { header: 'Credit (min)', key: 'creditMinutes', width: 14, style: { numFmt: '#,##0' } },
    ];
    rows.forEach((row) => sheet.addRow({ ...row, contractName: row.contractName ?? '' }));
    styleHeader(sheet);
    zebraRows(sheet);
  }

  addVendorSheet('Vendors', report.byVendor);
  addVendorSheet('UC', report.byUc);

  const trend = workbook.addWorksheet('Trend');
  trend.columns = [
    { header: 'Day', key: 'day', width: 14 },
    { header: 'Opened', key: 'opened', width: 12, style: { numFmt: '#,##0' } },
    { header: 'Closed', key: 'closed', width: 12, style: { numFmt: '#,##0' } },
  ];
  report.trend.forEach((row) => trend.addRow(row));
  styleHeader(trend);
  zebraRows(trend);

  const aging = workbook.addWorksheet('Aging');
  aging.columns = [
    { header: 'Number', key: 'number', width: 14 },
    { header: 'Title', key: 'title', width: 42 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Age (days)', key: 'ageDays', width: 12, style: { numFmt: '#,##0' } },
    { header: 'Assignee', key: 'assigneeName', width: 22 },
  ];
  report.aging.forEach((row) =>
    aging.addRow({
      ...row,
      assigneeName: row.assigneeName ?? 'Unassigned',
    }),
  );
  styleHeader(aging);
  zebraRows(aging);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function drawTable(
  doc: PDFKit.PDFDocument,
  y: number,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  const rowHeight = 18;
  const headerHeight = 20;

  function ensureSpace(needed: number) {
    if (y + needed > 780) {
      doc.addPage();
      y = 36;
    }
  }

  function headerRow() {
    ensureSpace(headerHeight + rowHeight);
    doc.save();
    doc.rect(MARGIN, y, CONTENT_WIDTH, headerHeight).fill('#2563eb');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let x = MARGIN + 8;
    headers.forEach((header, index) => {
      doc.text(header, x, y + 6, { width: colWidths[index] - 10, lineBreak: false });
      x += colWidths[index];
    });
    doc.restore();
    y += headerHeight;
  }

  headerRow();
  rows.forEach((row, index) => {
    ensureSpace(rowHeight);
    if (index % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill('#f4f4f5');
      doc.restore();
    }
    doc.font('Helvetica').fontSize(8).fillColor('#3f3f46');
    let x = MARGIN + 8;
    row.forEach((cell, cellIndex) => {
      doc.text(cell, x, y + 5, { width: colWidths[cellIndex] - 10, lineBreak: false, ellipsis: true });
      x += colWidths[cellIndex];
    });
    y += rowHeight;
  });

  return y;
}

export async function reportToPdf(report: ReportSnapshot) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: { Title: 'NovaCRM operations report', Author: 'NovaCRM' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 28;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#18181b').text('Operations report', MARGIN, y);
    y = 54;
    doc.font('Helvetica').fontSize(9).fillColor('#71717a').text(
      `NovaCRM  ·  ${report.rangeDays}-day window  ·  ${formatReportPeriod(report)}  ·  ${formatGeneratedAt(report.generatedAt)}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH },
    );

    y = 78;
    const kpis = kpiEntries(report);
    const boxGap = 8;
    const boxW = (CONTENT_WIDTH - boxGap * 3) / 4;
    const boxH = 50;
    kpis.forEach(([label, value], index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = MARGIN + col * (boxW + boxGap);
      const boxY = y + row * (boxH + boxGap);
      doc.save();
      doc.roundedRect(x, boxY, boxW, boxH, 5).lineWidth(0.6).strokeColor('#e4e4e7').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#71717a').text(label.toUpperCase(), x + 10, boxY + 10, {
        width: boxW - 20,
        lineBreak: false,
      });
      const danger = label.toLowerCase().includes('breach') && value > 0;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(danger ? '#e11d48' : '#18181b').text(String(value), x + 10, boxY + 24, {
        width: boxW - 20,
      });
      doc.restore();
    });

    y += Math.ceil(kpis.length / 4) * (boxH + boxGap) + 16;

    const section = (title: string) => {
      if (y > 720) {
        doc.addPage();
        y = 36;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#18181b').text(title, MARGIN, y);
      y += 18;
    };

    section('Process mix');
    y = drawTable(
      doc,
      y,
      ['Process', 'Count'],
      report.byType.map((row) => [row.label, String(row.value)]),
      [CONTENT_WIDTH - 80, 80],
    );

    y += 16;
    section('Status');
    y = drawTable(
      doc,
      y,
      ['Status', 'Count'],
      report.byStatus.map((row) => [row.label, String(row.value)]),
      [CONTENT_WIDTH - 80, 80],
    );

    y += 16;
    section('Priority');
    y = drawTable(
      doc,
      y,
      ['Priority', 'Count'],
      report.byPriority.map((row) => [row.label, String(row.value)]),
      [CONTENT_WIDTH - 80, 80],
    );

    if (report.assignees.length > 0) {
      y += 16;
      section('Assignee load');
      y = drawTable(
        doc,
        y,
        ['Assignee', 'Tickets'],
        report.assignees.map((row) => [row.label, String(row.value)]),
        [CONTENT_WIDTH - 80, 80],
      );
    }

    if (report.byVendor.length > 0) {
      y += 16;
      section('Vendor / principal queue');
      y = drawTable(
        doc,
        y,
        ['Vendor', 'Open', 'Breach', 'Queue'],
        report.byVendor.map((row) => [
          row.label,
          String(row.open),
          String(row.olaBreached),
          `${row.avgQueueMinutes}m`,
        ]),
        [CONTENT_WIDTH - 180, 60, 60, 60],
      );
    }

    if (report.aging.length > 0) {
      y += 16;
      section('Aging open tickets');
      drawTable(
        doc,
        y,
        ['Number', 'Title', 'Age', 'Assignee'],
        report.aging.map((row) => [
          row.number,
          row.title,
          `${row.ageDays}d`,
          row.assigneeName ?? 'Unassigned',
        ]),
        [90, CONTENT_WIDTH - 90 - 50 - 110, 50, 110],
      );
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      doc.save();
      doc.rect(0, 0, PAGE_WIDTH, 6).fill('#3b82f6');
      doc.font('Helvetica').fontSize(8).fillColor('#a1a1aa');
      doc.text(`NovaCRM operations  ·  ${report.rangeDays}d`, MARGIN, 810, { width: 240, lineBreak: false });
      doc.text(`${i + 1} / ${pages.count}`, MARGIN, 810, { width: CONTENT_WIDTH, align: 'right' });
      doc.restore();
    }

    doc.end();
  });
}

export function exportContentType(format: ReportExportFormat) {
  if (format === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (format === 'pdf') return 'application/pdf';
  return 'text/csv; charset=utf-8';
}
