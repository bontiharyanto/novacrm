import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listOrgUnits } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { OrgUnitCreate } from '@/components/org/org-unit-create';
import { Skeleton } from '@/components/ui/skeleton';

export default async function NewOrgUnitPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Org')) {
    redirect('/org');
  }
  const [units, agents] = await Promise.all([listOrgUnits(), listAssignableAgents()]);
  const divisions = units.filter((unit) => unit.type === 'division');

  return (
    <Suspense fallback={<Skeleton className="m-6 h-[420px]" />}>
      <OrgUnitCreate divisions={divisions} agents={agents} />
    </Suspense>
  );
}
