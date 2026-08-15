import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { getTenantById } from '@/lib/tenants/actions';
import { TenantDetail } from '@/components/tenants/tenant-detail';

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Tenant')) {
    redirect('/dashboard');
  }
  const tenant = await getTenantById(params.id);
  if (!tenant) notFound();
  return <TenantDetail tenant={tenant} currentTenantId={session.profile.tenantId} />;
}
