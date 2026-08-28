import { redirect } from 'next/navigation';
import { CapabilityMatrix } from '@/components/settings/capability-matrix';
import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';

export default async function CapabilitySettingsPage() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    redirect('/dashboard');
  }
  return <CapabilityMatrix />;
}
