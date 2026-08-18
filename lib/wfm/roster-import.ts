import ExcelJS from 'exceljs';
import { normalizeHeader, pick } from '@/lib/import/parse';

export const ROSTER_IMPORT_MAX = 500;
export const ROSTER_TEMPLATE_HEADERS = ['date', 'email', 'name', 'group', 'shift'] as const;

export const ROSTER_TEMPLATE_SAMPLE = [
  { date: '2026-08-17', email: 'andi@novacrm.app', name: 'Andi On-call', group: 'Bank L1', shift: 'Pagi' },
  { date: '2026-08-18', email: 'budi@novacrm.app', name: 'Budi L1', group: 'Bank L1', shift: 'Siang' },
];

export type RosterImportRow = {
  workDate: string;
  email: string;
  name: string;
  group: string;
  shift: string;
};

export function parseWorkDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + serial * 86_400_000).toISOString().slice(0, 10);
  }
  return null;
}

export function mapRosterImportRows(rows: Record<string, string>[]): RosterImportRow[] {
  return rows.map((row) => ({
    workDate: pick(row, 'date', 'tanggal', 'workdate', 'work_date', 'hari'),
    email: pick(row, 'email', 'mail', 'user'),
    name: pick(row, 'name', 'nama', 'agent', 'full_name', 'fullname'),
    group: pick(row, 'group', 'grup', 'team', 'assignmentgroup'),
    shift: pick(row, 'shift', 'template', 'shiftname', 'pola'),
  }));
}

export function rosterTemplateCsv() {
  const lines = [
    ROSTER_TEMPLATE_HEADERS.join(','),
    ...ROSTER_TEMPLATE_SAMPLE.map((row) =>
      ROSTER_TEMPLATE_HEADERS.map((key) => {
        const value = row[key];
        return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\n')}\n`;
}

export async function rosterTemplateXlsx() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Roster');
  const header = sheet.addRow([...ROSTER_TEMPLATE_HEADERS]);
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
    cell.font = { bold: true, color: { argb: 'FFFAFAFA' } };
  });
  for (const row of ROSTER_TEMPLATE_SAMPLE) {
    sheet.addRow(ROSTER_TEMPLATE_HEADERS.map((key) => row[key]));
  }
  sheet.columns = ROSTER_TEMPLATE_HEADERS.map((headerName) => ({
    width: Math.max(16, headerName.length + 6),
  }));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function keyName(value: string) {
  return normalizeHeader(value);
}
