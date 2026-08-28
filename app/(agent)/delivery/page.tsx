import { DeliveryProjectList } from '@/components/delivery/delivery-project-list';
import { listAccessibleAccounts } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/rbac/roles';

export default async function DeliveryPage() {
  const session = await getSessionProfile();
  const accounts = session ? await listAccessibleAccounts(session) : [];
  return <DeliveryProjectList canManage={isStaffRole(session?.profile.role)} accounts={accounts} />;
}
