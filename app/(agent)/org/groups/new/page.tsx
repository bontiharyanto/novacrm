import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listUnderpinningContracts } from '@/lib/uc/actions';
import { OrgGroupCreate } from '@/components/org/org-group-create';

export default async function NewOrgGroupPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Org')) {
    redirect('/org');
  }
  const contracts = await listUnderpinningContracts();
  return (
    <OrgGroupCreate
      contracts={contracts.map((item) => ({
        id: item.id,
        name: item.name,
        partyKind: item.partyKind,
        partyName: item.partyName,
        isActive: item.isActive,
      }))}
    />
  );
}
