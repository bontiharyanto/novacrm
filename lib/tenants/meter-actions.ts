'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';
import { getTenantMeterSnapshot, type TenantMeterSnapshot } from '@/lib/tenants/meter';

export async function getSessionTenantMeter(): Promise<TenantMeterSnapshot | null> {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) return null;
  return getTenantMeterSnapshot(session.profile.tenantId);
}
