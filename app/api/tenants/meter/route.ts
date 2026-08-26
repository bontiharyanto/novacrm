import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';
import { getTenantMeterSnapshot, meterDimensions, worstMeterLevel } from '@/lib/tenants/meter';

export async function GET() {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await getTenantMeterSnapshot(session.profile.tenantId);
  if (!snapshot) {
    return NextResponse.json({ data: null, error: 'Tenant not found' }, { status: 404 });
  }

  const dimensions = meterDimensions(snapshot);
  return NextResponse.json({
    data: {
      ...snapshot,
      dimensions,
      level: worstMeterLevel(dimensions),
    },
    error: null,
  });
}
