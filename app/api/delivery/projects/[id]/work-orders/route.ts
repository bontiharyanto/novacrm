import { NextRequest, NextResponse } from 'next/server';
import { createDeliveryWorkOrder } from '@/lib/delivery/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const result = await createDeliveryWorkOrder(params.id, await request.json().catch(() => null));
  if (result.error) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 400 });
  return NextResponse.json(result, { status: 201 });
}
