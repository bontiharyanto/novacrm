import { NextRequest, NextResponse } from 'next/server';
import { importAssets } from '@/lib/assets/actions';
import { requireApiUser } from '@/lib/api/require-user';

function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? '').trim();
    });
    return {
      name: row.name,
      assetTag: row.assettag || row.tag || undefined,
      type: row.type,
      status: row.status,
      brand: row.brand,
      model: row.model,
      serial: row.serial,
      purchaseDate: row.purchasedate || row.purchase_date,
      warrantyExpiry: row.warrantyexpiry || row.warranty,
      cost: row.cost,
      usefulLifeMonths: row.usefullifemonths || row.life,
      location: row.location,
      assignedTo: row.assignedto || row.assigned,
      notes: row.notes,
    };
  });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
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

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('create', 'Asset');
  if (auth.error) return auth.error;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let rows: unknown[] = [];
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      rows = parseCsv(await request.text());
    } else {
      const body = await request.json();
      rows = Array.isArray(body) ? body : body.rows ?? [];
    }
    if (rows.length === 0) {
      return NextResponse.json({ data: null, error: 'CSV has no data rows.' }, { status: 400 });
    }
    const result = await importAssets(rows);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to import assets' },
      { status: 500 },
    );
  }
}
