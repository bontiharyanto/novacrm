import { NextRequest, NextResponse } from 'next/server';
import { getNotificationSettings, saveNotificationSettings, testNotificationChannel } from '@/lib/settings/notifications';

export async function GET() {
  const data = await getNotificationSettings();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = await saveNotificationSettings(json);
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json();
    const channel = json.channel as 'whatsapp' | 'telegram' | 'email';
    const result = await testNotificationChannel(channel, json.values ?? {});
    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to test channel' },
      { status: 500 }
    );
  }
}
