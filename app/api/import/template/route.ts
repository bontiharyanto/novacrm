import { NextRequest, NextResponse } from 'next/server';
import { isImportKind } from '@/lib/import/catalog';
import { toCsv, toXlsx, toXlsxAll } from '@/lib/import/parse';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const kind = request.nextUrl.searchParams.get('kind') ?? 'all';
  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';

  if (kind === 'all' || kind === '') {
    const buffer = await toXlsxAll();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="novacrm-import-templates.xlsx"',
      },
    });
  }

  if (!isImportKind(kind)) {
    return NextResponse.json({ data: null, error: 'Unknown import type.' }, { status: 400 });
  }

  if (format === 'xlsx') {
    const buffer = await toXlsx(kind);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="novacrm-${kind}-template.xlsx"`,
      },
    });
  }

  return new NextResponse(toCsv(kind), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="novacrm-${kind}-template.csv"`,
    },
  });
}
