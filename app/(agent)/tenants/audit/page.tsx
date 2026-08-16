import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { TenantIsolationAudit } from '@/components/tenants/tenant-isolation-audit';

export default async function TenantAuditPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Tenant')) {
    redirect('/dashboard');
  }
  return <TenantIsolationAudit />;
}
