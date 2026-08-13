import { listAssignmentGroups, listOrgUnits } from '@/lib/org/actions';
import { getAccountScope } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { OrgDashboard } from '@/components/org/org-dashboard';

export default async function OrgPage() {
  const session = await getSessionProfile();
  const scope = await getAccountScope(session);
  const [units, groups] = await Promise.all([listOrgUnits(), listAssignmentGroups()]);

  return (
    <OrgDashboard
      units={units}
      groups={groups}
      canCreate={session ? canRole(session.profile.role, 'create', 'Org') : false}
      accountName={scope.account?.name}
      accountType={scope.account?.type}
    />
  );
}
