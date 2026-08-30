import { NextResponse } from 'next/server';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { getDeliveryReport } from '@/lib/delivery/report';
import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getSessionProfile();
  if (
    !session ||
    isCustomerRole(session.profile.role) ||
    !(await canAccessConfiguredCapability('read', 'DeliveryReport'))
  ) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDeliveryReport();
  if (!data) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data, error: null }, { headers: { 'Cache-Control': 'no-store' } });
}
