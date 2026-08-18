import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { rosterTemplateCsv, rosterTemplateXlsx } from '@/lib/wfm/roster-import';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Wfm');
  if (auth.error) return auth.error;

  const format = request.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  if (format === 'xlsx') {
    const buffer = await rosterTemplateXlsx();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="novacrm-roster-template.xlsx"',
      },
    });
  }

  return new NextResponse(rosterTemplateCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="novacrm-roster-template.csv"',
    },
  });
}
