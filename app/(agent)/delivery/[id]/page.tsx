import { DeliveryProjectDetail } from '@/components/delivery/delivery-project-detail';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listDeliveryAssignmentOptions } from '@/lib/delivery/actions';

export default async function DeliveryProjectPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  const role = session?.profile.role;
  const canManageAssignments = role === 'manager' || role === 'admin' || role === 'superadmin';
  const assignmentOptions = canManageAssignments ? await listDeliveryAssignmentOptions() : { pm: [], dco: [] };
  return (
    <DeliveryProjectDetail
      projectId={params.id}
      canManagePhases={Boolean(role && canRole(role, 'update', 'DeliveryPhase'))}
      canCreateWorkOrder={Boolean(role && canRole(role, 'create', 'DeliveryWorkOrder'))}
      canManageHandover={Boolean(role && canRole(role, 'update', 'DeliveryHandover'))}
      canAcceptHandover={Boolean(role && canRole(role, 'update', 'OperationalAcceptance'))}
      canCreateTaskActivity={Boolean(role && canRole(role, 'create', 'TaskActivity'))}
      canManageTasks={Boolean(role && canRole(role, 'update', 'DeliveryTask'))}
      canPublishActivity={Boolean(role && canRole(role, 'update', 'DeliveryPublish'))}
      canManageAssignments={canManageAssignments}
      assignmentOptions={assignmentOptions}
    />
  );
}
