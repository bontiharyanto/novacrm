import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { TenantCreate } from '@/components/tenants/tenant-create';

export default async function NewTenantPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Tenant')) {
    redirect('/tenants');
  }
  return <TenantCreate />;
}
