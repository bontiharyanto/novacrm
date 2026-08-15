import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isStaffRole, isTenantAdminRole } from '@/lib/rbac/roles';
import { getMfaPolicy, listOwnMfaFactors } from '@/lib/auth/mfa';
import { SecuritySettings } from '@/components/settings/security-settings';

export default async function SecurityPage({ searchParams }: { searchParams?: { enroll?: string } }) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    redirect('/login');
  }
  const [policy, factors] = await Promise.all([getMfaPolicy(), listOwnMfaFactors()]);
  return (
    <SecuritySettings
      policy={policy}
      factors={factors.data}
      canToggle={isTenantAdminRole(session.profile.role)}
      forceEnroll={searchParams?.enroll === '1'}
    />
  );
}
