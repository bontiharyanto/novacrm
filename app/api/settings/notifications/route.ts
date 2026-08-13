import { NextRequest, NextResponse } from 'next/server';
import { getNotificationSettings, saveNotificationSettings, testNotificationChannel } from '@/lib/settings/notifications';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'NotificationSettings');
  if (auth.error) return auth.error;

  const data = await getNotificationSettings();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;

  try {
    const json = await request.json();
    const result = await saveNotificationSettings(json);
    if (result && 'error' in result) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save settings' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;

  try {
    const json = await request.json();
    const channel = json.channel as 'whatsapp' | 'telegram' | 'email';
    const result = await testNotificationChannel(channel, json.values ?? {});
    return NextResponse.json({ data: result, error: result.ok ? null : result.error ?? 'Unable to test channel' });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to test channel' },
      { status: 500 },
    );
  }
}
