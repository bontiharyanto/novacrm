import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationCatalog, saveIntegration, testIntegration } from '@/lib/settings/integrations';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'NotificationSettings');
  if (auth.error) return auth.error;
  const data = await getIntegrationCatalog();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const kind = typeof body.kind === 'string' ? body.kind : '';
    if (!kind) {
      return NextResponse.json({ data: null, error: 'Plugin is required' }, { status: 400 });
    }
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
    const kind = typeof body.kind === 'string' ? body.kind : '';
    const result = await testIntegration(kind, body.values ?? {});
    return NextResponse.json({ data: result, error: result.ok ? null : result.error ?? 'Test failed' });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to test integration' },
      { status: 500 },
    );
  }
}
