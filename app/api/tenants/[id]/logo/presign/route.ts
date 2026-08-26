import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api/require-user';
import { createPresignedUpload } from '@/lib/minio/presign';
import { isTenantLogoContentType } from '@/lib/tenants/logo';

const presignSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('update', 'Tenant');
  if (auth.error) return auth.error;

  const tenantId = params.id?.trim();
  if (!tenantId) {
    return NextResponse.json({ data: null, error: 'Tenant required' }, { status: 400 });
  }

  try {
    const body = presignSchema.parse(await request.json());
    if (!isTenantLogoContentType(body.contentType)) {
      return NextResponse.json(
        { data: null, error: 'Use PNG, JPEG, WebP, or SVG' },
        { status: 400 },
      );
    }

    const result = await createPresignedUpload({
      tenantId,
      filename: `logo-${body.filename}`,
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
