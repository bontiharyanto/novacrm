import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationHub, saveIntegration, testIntegration } from '@/lib/settings/integrations';
import { requireApiUser } from '@/lib/api/require-user';
import type { IntegrationKind } from '@/lib/integrations/types';

export async function GET() {
  const auth = await requireApiUser('read', 'NotificationSettings');
  if (auth.error) return auth.error;
  const data = await getIntegrationHub();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const kind = body.kind as IntegrationKind;
    const result = await saveIntegration(kind, body.values ?? body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save integration' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const kind = body.kind as IntegrationKind;
    const result = await testIntegration(kind, body.values ?? {});
    return NextResponse.json({ data: result, error: result.ok ? null : result.error ?? 'Test failed' });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to test integration' },
      { status: 500 },
    );
  }
}
