import { NextRequest, NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { isCustomerRole } from '@/lib/rbac/roles';
import { getDeliveryReport } from '@/lib/delivery/report';
import {
  deliveryReportContentType,
  deliveryReportFilename,
  deliveryReportToCsv,
  deliveryReportToPdf,
  deliveryReportToXlsx,
} from '@/lib/delivery/report-export';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

function parseFormat(value: string | null): ExportFormat | null {
  if (value === 'csv' || value === 'xlsx' || value === 'pdf') return value;
  return null;
}

export async function GET(request: NextRequest) {
  const format = parseFormat(request.nextUrl.searchParams.get('format'));
  if (!format) {
    return NextResponse.json({ data: null, error: 'format must be csv, xlsx, or pdf' }, { status: 400 });
  }

  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canAccessConfiguredCapability('read', 'DeliveryReport'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  const report = await getDeliveryReport();
  if (!report) {
    return NextResponse.json({ data: null, error: 'Unable to load report' }, { status: 400 });
  }

  const body =
    format === 'csv'
      ? Buffer.from(deliveryReportToCsv(report), 'utf8')
      : format === 'xlsx'
        ? await deliveryReportToXlsx(report)
        : await deliveryReportToPdf(report);
  const preview = format === 'pdf' && request.nextUrl.searchParams.get('preview') === '1';

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': deliveryReportContentType(format),
      'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${deliveryReportFilename(format)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
