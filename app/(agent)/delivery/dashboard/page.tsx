import { DeliveryCommandCenter } from '@/components/delivery/delivery-command-center';
import { getDeliveryDashboard } from '@/lib/delivery/dashboard';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function DeliveryDashboardPage() {
  const session = await getSessionProfile();
  const role = session?.profile.role;
  if (!session || !role || !canRole(role, 'read', 'DeliveryProject')) {
    return <DeliveryCommandCenter initialData={null} view="portfolio" />;
  }

  const initialData = await getDeliveryDashboard();
  return <DeliveryCommandCenter initialData={initialData} view={role === 'dco' ? 'execution' : 'portfolio'} />;
}
