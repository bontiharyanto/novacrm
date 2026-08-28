import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryProject, updateDeliveryPhase, updateDeliveryProject } from '@/lib/delivery/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const result = await getDeliveryProject(params.id);
  if (result.error) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 404 });
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.phaseId === 'string') {
    const result = await updateDeliveryPhase(params.id, body.phaseId, body);
    if (result.error) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 400 });
    return NextResponse.json(result);
  }
  const result = await updateDeliveryProject(params.id, body);
  if (result.error) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 400 });
  return NextResponse.json(result);
}
