import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { getDeliveryDashboard } from '@/lib/delivery/dashboard';

export async function GET() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'DeliveryProject')) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDeliveryDashboard();
  return NextResponse.json({ data, error: null }, { headers: { 'Cache-Control': 'no-store' } });
}
