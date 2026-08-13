import { notFound, redirect } from 'next/navigation';
import { getAssignmentGroupById } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
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
  const agents = await listAssignableAgents();

  return (
    <OrgGroupDetail group={group} agents={agents} canEdit={canRole(session.profile.role, 'update', 'Org')} />
  );
}
