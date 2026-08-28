import { NextRequest, NextResponse } from 'next/server';
import { createDeliveryProject, listDeliveryProjects } from '@/lib/delivery/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const data = await listDeliveryProjects();
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const result = await createDeliveryProject(await request.json().catch(() => null));
  if (result.error) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 400 });
  return NextResponse.json(result, { status: 201 });
}
