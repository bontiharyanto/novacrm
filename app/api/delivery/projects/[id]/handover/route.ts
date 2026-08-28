import { NextRequest, NextResponse } from 'next/server';
import {
  getDeliveryHandover,
  reviewDeliveryHandover,
  updateDeliveryHandoverItem,
} from '@/lib/delivery/handover-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function responseFor(result: { data: unknown; error: string | null }) {
  if (result.error) {
    return NextResponse.json(result, {
      status: result.error === 'Unauthorized' ? 401 : 400,
    });
  }
  return NextResponse.json(result);
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return responseFor(await getDeliveryHandover(params.id));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  return responseFor(await updateDeliveryHandoverItem(params.id, body));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  return responseFor(await reviewDeliveryHandover(params.id, body));
}
