import { notFound, redirect } from 'next/navigation';
import { getAssignmentGroupById, listAssignmentGroups } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { getDispatchPolicy, listSkills } from '@/lib/wfm/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { OrgGroupDetail } from '@/components/org/org-group-detail';

export default async function OrgGroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) {
    redirect('/dashboard');
  }
  const group = await getAssignmentGroupById(params.id);
  if (!group) notFound();
  const [agents, policy, skills, groups] = await Promise.all([
    listAssignableAgents(),
    getDispatchPolicy(params.id),
    listSkills(),
    listAssignmentGroups(),
  ]);

  return (
    <OrgGroupDetail
      group={group}
      agents={agents}
      canEdit={canRole(session.profile.role, 'update', 'Org')}
      policy={policy}
      skills={skills}
      groups={groups.map((item) => ({ id: item.id, name: item.name, kind: item.kind }))}
    />
  );
}
