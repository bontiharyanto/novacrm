import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listTenants } from '@/lib/tenants/actions';
import { TenantsDashboard } from '@/components/tenants/tenants-dashboard';

export default async function TenantsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Tenant')) {
    redirect('/dashboard');
  }
  const tenants = await listTenants();
  return <TenantsDashboard tenants={tenants} />;
}
