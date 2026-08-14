import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignmentGroups } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { listOncallRotations } from '@/lib/wfm/actions';
import { WfmOncall } from '@/components/wfm/wfm-oncall';

export default async function WfmOncallPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const [rotations, groups, staff] = await Promise.all([
    listOncallRotations(),
    listAssignmentGroups(),
    listAssignableAgents(),
  ]);
  return (
    <WfmOncall
      rotations={rotations}
      groups={groups.map((group) => ({ id: group.id, name: group.name, kind: group.kind }))}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      canEdit={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
