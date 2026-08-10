import { NextRequest, NextResponse } from 'next/server';
import { listNotificationLogs } from '@/lib/notifications/logs';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? 'default';
  const result = await listNotificationLogs(tenantId);
  return NextResponse.json({ data: result.data, error: result.error });
}
