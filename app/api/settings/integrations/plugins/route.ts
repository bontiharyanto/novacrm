import { NextRequest, NextResponse } from 'next/server';
import { createIntegrationPlugin, deleteIntegrationPlugin } from '@/lib/settings/integrations';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await createIntegrationPlugin(body);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, slug: result.slug, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to add plugin' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiUser('update', 'NotificationSettings');
  if (auth.error) return auth.error;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ data: null, error: 'Plugin id is required' }, { status: 400 });
  }
  const result = await deleteIntegrationPlugin(id);
  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data, error: null });
}
