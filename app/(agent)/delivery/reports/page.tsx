import { redirect } from 'next/navigation';
import { DeliveryReport } from '@/components/delivery/delivery-report';
import { getDeliveryReport } from '@/lib/delivery/report';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { getSessionProfile } from '@/lib/auth/session';
import { homePathForRole, isCustomerRole } from '@/lib/rbac/roles';

export default async function DeliveryReportsPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (isCustomerRole(session.profile.role) || !(await canAccessConfiguredCapability('read', 'DeliveryReport'))) {
    redirect(homePathForRole(session.profile.role));
  }

  const initialData = await getDeliveryReport();
  return <DeliveryReport initialData={initialData} />;
}
