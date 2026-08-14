import ExcelJS from 'exceljs';
import { IMPORT_CATALOG, type ImportKind } from '@/lib/import/catalog';

export const IMPORT_MAX_ROWS = 500;

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0] ?? '').map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = (cells[index] ?? '').trim();
    });
    return row;
  });
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value && value.text != null) return String(value.text);
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue);
    if ('hyperlink' in value) return String(value.text ?? value.hyperlink ?? '');
  }
  return String(value).trim();
}

export async function parseXlsx(buffer: ArrayBuffer | Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer));
  await workbook.xlsx.load(data as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = new Map<number, string>();
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, col) => {
        const header = normalizeHeader(cellToString(cell.value));
        if (header) headers.set(col, header);
      });
      return;
    }
    const record: Record<string, string> = {};
    headers.forEach((header, col) => {
      record[header] = cellToString(row.getCell(col).value);
    });
    if (Object.values(record).some((value) => value.trim())) {
      rows.push(record);
    }
  });
  return rows;
}

export async function parseImportFile(file: File): Promise<{ rows: Record<string, string>[]; error: string | null }> {
  const name = file.name.toLowerCase();
  if (file.size > 2 * 1024 * 1024) {
    return { rows: [], error: 'File is larger than 2 MB.' };
  }

  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type.includes('csv') || file.type.includes('text/plain')) {
    const rows = parseCsv(await file.text());
    return { rows, error: null };
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    const rows = await parseXlsx(await file.arrayBuffer());
    return { rows, error: null };
  }

  return { rows: [], error: 'Use a .csv or .xlsx file.' };
}

export function toCsv(kind: ImportKind) {
  const entity = IMPORT_CATALOG.find((item) => item.kind === kind);
  if (!entity) return '';
  const headers = entity.columns.map((column) => column.key);
  const lines = [
    headers.map(csvEscape).join(','),
    ...entity.sample.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}\n`;
}

function addEntitySheet(workbook: ExcelJS.Workbook, kind: ImportKind) {
  const entity = IMPORT_CATALOG.find((item) => item.kind === kind);
  if (!entity) throw new Error('Unknown import kind');
  const sheet = workbook.addWorksheet(entity.title.slice(0, 31));
  const headers = entity.columns.map((column) => column.key);
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
    cell.font = { bold: true, color: { argb: 'FFFAFAFA' } };
  });
  for (const sample of entity.sample) {
    sheet.addRow(headers.map((header) => sample[header] ?? ''));
  }
  sheet.columns = headers.map((header) => ({ width: Math.max(14, header.length + 4) }));
}

export async function toXlsx(kind: ImportKind) {
  const workbook = new ExcelJS.Workbook();
  addEntitySheet(workbook, kind);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function toXlsxAll() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NovaCRM';
  for (const entity of IMPORT_CATALOG) {
    addEntitySheet(workbook, entity.kind);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function pick(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) return value.trim();
  }
  return '';
}
