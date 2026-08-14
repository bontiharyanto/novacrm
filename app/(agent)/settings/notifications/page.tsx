import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { IntegrationsSettings } from '@/components/settings/integrations-settings';

export default async function NotificationSettingsPage() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    redirect('/dashboard');
  }
  return <IntegrationsSettings />;
}
