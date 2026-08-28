import { DeliveryProjectList } from '@/components/delivery/delivery-project-list';
import { listAccessibleAccounts } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function DeliveryPage() {
  const session = await getSessionProfile();
  const accounts = session ? await listAccessibleAccounts(session) : [];
  return (
    <DeliveryProjectList
      canManage={Boolean(session && canRole(session.profile.role, 'create', 'DeliveryProject'))}
      accounts={accounts}
    />
  );
}
