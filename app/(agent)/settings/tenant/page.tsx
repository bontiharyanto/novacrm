import { redirect } from 'next/navigation';
import { TenantSettings } from '@/components/settings/tenant-settings';
import { getTenantConfig } from '@/lib/tenants/config';
import { resolveTenantLogoUrl } from '@/lib/tenants/logo';
import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';

export default async function TenantSettingsPage() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    redirect('/dashboard');
  }

  const config = await getTenantConfig();
  if (!config) redirect('/dashboard');
  const logoUrl = await resolveTenantLogoUrl(config.id, config.logoObjectKey);

  return <TenantSettings config={config} logoUrl={logoUrl} />;
}
