import { NextRequest, NextResponse } from 'next/server';
import { listCapabilityMatrix, updateCapability } from '@/lib/rbac/capability-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const result = await listCapabilityMatrix();
  return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 200 });
}

export async function PATCH(request: NextRequest) {
  const result = await updateCapability(await request.json().catch(() => null));
  return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : result.error ? 400 : 200 });
}
