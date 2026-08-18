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
import { wfmReportFilename, wfmReportToCsv, wfmReportToXlsx } from '@/lib/reports/wfm-export';
import { parseReportPeriod } from '@/lib/reports/period';
import { listWfmAttendance, listWfmCoverage } from '@/lib/wfm/swap-actions';
import type { ReportExportFormat } from '@/lib/reports/schema';

function parseFormat(value: string | null): ReportExportFormat | null {
  if (value === 'csv' || value === 'xlsx' || value === 'pdf') return value;
  return null;
}

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get('kind');
  const format = parseFormat(request.nextUrl.searchParams.get('format'));
  if (!format) {
    return NextResponse.json({ data: null, error: 'format must be csv, xlsx, or pdf' }, { status: 400 });
  }

  if (kind === 'workforce') {
    const auth = await requireApiUser('create', 'Wfm');
    if (auth.error) return auth.error;
    if (format === 'pdf') {
      return NextResponse.json({ data: null, error: 'Workforce export is CSV or Excel only' }, { status: 400 });
    }
    const period = parseReportPeriod({
      range: request.nextUrl.searchParams.get('range'),
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
    });
    const [coverage, attendance] = await Promise.all([
      listWfmCoverage(period.startKey, period.endKey),
      listWfmAttendance(period.startKey, period.endKey),
    ]);
    const body =
      format === 'xlsx'
        ? await wfmReportToXlsx(coverage, attendance)
        : Buffer.from(wfmReportToCsv(coverage, attendance), 'utf8');
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': exportContentType(format),
        'Content-Disposition': `attachment; filename="${wfmReportFilename(period.startKey, period.endKey, format)}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

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
