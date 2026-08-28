import { DeliveryProjectDetail } from '@/components/delivery/delivery-project-detail';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function DeliveryProjectPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  const role = session?.profile.role;
  return (
    <DeliveryProjectDetail
      projectId={params.id}
      canManagePhases={Boolean(role && canRole(role, 'update', 'DeliveryPhase'))}
      canCreateWorkOrder={Boolean(role && canRole(role, 'create', 'DeliveryWorkOrder'))}
    />
  );
}
