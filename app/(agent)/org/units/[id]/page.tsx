import { notFound, redirect } from 'next/navigation';
import { getOrgUnitById, listOrgUnits } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { OrgUnitDetail } from '@/components/org/org-unit-detail';

export default async function OrgUnitDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Org')) {
    redirect('/dashboard');
  }
  const unit = await getOrgUnitById(params.id);
  if (!unit) notFound();
  const [units, agents] = await Promise.all([listOrgUnits(), listAssignableAgents()]);

  return (
    <OrgUnitDetail
      unit={unit}
      divisions={units.filter((item) => item.type === 'division')}
      agents={agents}
      canEdit={canRole(session.profile.role, 'update', 'Org')}
    />
  );
}
