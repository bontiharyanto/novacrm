import { NextResponse } from 'next/server';
import { listNotificationLogs } from '@/lib/notifications/logs';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'NotificationLog');
  if (auth.error) return auth.error;

  const result = await listNotificationLogs(auth.session.profile.tenantId);
  return NextResponse.json({ data: result.data, error: result.error });
}
