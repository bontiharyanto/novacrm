import ExcelJS from 'exceljs';
import type { WfmAttendanceRow, WfmCoverageGap } from '@/lib/wfm/schema';

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function wfmReportFilename(from: string, to: string, format: 'csv' | 'xlsx') {
  return `novacrm-wfm-${from.replace(/-/g, '')}-${to.replace(/-/g, '')}.${format}`;
}

export function wfmReportToCsv(coverage: WfmCoverageGap[], attendance: WfmAttendanceRow[]) {
  const lines = [
    'sheet,date,group,agent,shift,hours,clocked_in,clock_in_at,headcount',
    ...coverage.map(
      (row) =>
        `coverage_gaps,${row.workDate},${csvEscape(row.groupName)},,,,,${row.headcount}`,
    ),
    ...attendance.map(
      (row) =>
        `clock_in_vs_roster,${row.workDate},${csvEscape(row.groupName)},${csvEscape(row.userName)},${csvEscape(row.shiftName)},${csvEscape(row.hours)},${row.clockedIn ? 'yes' : 'no'},${row.clockInAt ?? ''},`,
    ),
  ];
  return lines.join('\n');
}

export async function wfmReportToXlsx(coverage: WfmCoverageGap[], attendance: WfmAttendanceRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NovaCRM';
  workbook.created = new Date();

  const gaps = workbook.addWorksheet('Coverage gaps');
  gaps.columns = [
    { header: 'Date', key: 'workDate', width: 14 },
    { header: 'Group', key: 'groupName', width: 28 },
    { header: 'Headcount', key: 'headcount', width: 12 },
  ];
  coverage.forEach((row) => gaps.addRow({ workDate: row.workDate, groupName: row.groupName, headcount: row.headcount }));

  const punches = workbook.addWorksheet('Clock-in vs roster');
  punches.columns = [
    { header: 'Date', key: 'workDate', width: 14 },
    { header: 'Agent', key: 'userName', width: 24 },
    { header: 'Group', key: 'groupName', width: 24 },
    { header: 'Shift', key: 'shiftName', width: 18 },
    { header: 'Hours', key: 'hours', width: 16 },
    { header: 'Clocked in', key: 'clockedIn', width: 12 },
    { header: 'Clock-in at', key: 'clockInAt', width: 24 },
  ];
  attendance.forEach((row) =>
    punches.addRow({
      workDate: row.workDate,
      userName: row.userName,
      groupName: row.groupName,
      shiftName: row.shiftName,
      hours: row.hours,
      clockedIn: row.clockedIn ? 'yes' : 'no',
      clockInAt: row.clockInAt ?? '',
    }),
  );

  for (const sheet of [gaps, punches]) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    header.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
