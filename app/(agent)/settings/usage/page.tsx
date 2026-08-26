import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';
import { getSessionTenantMeter } from '@/lib/tenants/meter-actions';
import { UsageSettings } from '@/components/settings/usage-settings';

export default async function UsagePage() {
  const session = await getSessionProfile();
  if (!session || isCustomerRole(session.profile.role)) {
    redirect('/dashboard');
  }
  const snapshot = await getSessionTenantMeter();
  if (!snapshot) {
    redirect('/dashboard');
  }
  return <UsageSettings snapshot={snapshot} />;
}
