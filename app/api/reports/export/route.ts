import { NextRequest, NextResponse } from 'next/server';
import { getReportSnapshot } from '@/lib/reports/actions';
import { requireApiUser } from '@/lib/api/require-user';
import {
  exportContentType,
  exportFilename,
  reportToCsv,
  reportToPdf,
  reportToXlsx,
} from '@/lib/reports/export';
import type { ReportExportFormat } from '@/lib/reports/schema';

function parseFormat(value: string | null): ReportExportFormat | null {
  if (value === 'csv' || value === 'xlsx' || value === 'pdf') return value;
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const format = parseFormat(request.nextUrl.searchParams.get('format'));
  if (!format) {
    return NextResponse.json({ data: null, error: 'format must be csv, xlsx, or pdf' }, { status: 400 });
  }

  const report = await getReportSnapshot({
    range: request.nextUrl.searchParams.get('range'),
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
  });
  if (!report) {
    return NextResponse.json({ data: null, error: 'Unable to load report' }, { status: 400 });
  }

  const body =
    format === 'xlsx' ? await reportToXlsx(report) : format === 'pdf' ? await reportToPdf(report) : Buffer.from(reportToCsv(report), 'utf8');

  const inline = request.nextUrl.searchParams.get('preview') === '1';

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': exportContentType(format),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${exportFilename(report, format)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
