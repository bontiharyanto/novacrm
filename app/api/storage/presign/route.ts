import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api/require-user';
import { createPresignedUpload } from '@/lib/minio/presign';

const presignSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120).default('application/octet-stream'),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('update', 'Ticket');
  if (auth.error) return auth.error;

  try {
    const body = presignSchema.parse(await request.json());
    const result = await createPresignedUpload({
      tenantId: auth.session.profile.tenantId,
      filename: body.filename,
      contentType: body.contentType,
    });

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 503 });
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to create upload URL' },
      { status: 400 },
    );
  }
}
