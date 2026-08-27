import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { createPresignedDownload } from '@/lib/minio/presign';
import { isTenantObjectKey } from '@/lib/tickets/activity';

/** Redirects to a short-lived MinIO URL so <img src> works with session cookies. */
export async function GET(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const key = request.nextUrl.searchParams.get('key')?.trim() ?? '';
  if (!isTenantObjectKey(auth.session.profile.tenantId, key)) {
    return NextResponse.json({ data: null, error: 'Invalid file' }, { status: 400 });
  }

  try {
    const result = await createPresignedDownload(key, 600);
    if (result.error || !result.data?.url) {
      return NextResponse.json({ data: null, error: result.error ?? 'Unable to open file' }, { status: 503 });
    }
    return NextResponse.redirect(result.data.url, 302);
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to open file' },
      { status: 500 },
    );
  }
}
