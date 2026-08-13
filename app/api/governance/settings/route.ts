import { NextRequest, NextResponse } from 'next/server';
import { getPrivacySettings, savePrivacySettings } from '@/lib/governance/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Governance');
  if (auth.error) return auth.error;
  const data = await getPrivacySettings();
  return NextResponse.json({ data, error: null });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser('update', 'Governance');
  if (auth.error) return auth.error;
  try {
    const result = await savePrivacySettings(await request.json());
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: result.error === 'Unauthorized' ? 403 : 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to save settings' },
      { status: 400 },
    );
  }
}
