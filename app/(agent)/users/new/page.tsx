import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAccounts } from '@/lib/accounts/actions';
import { listDirectoryGroups, listHomeUnits } from '@/lib/users/actions';
import { UserCreate } from '@/components/users/user-create';

export default async function NewUserPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'User')) {
    redirect('/users');
  }
  const [accounts, units, groups] = await Promise.all([listAccounts(), listHomeUnits(), listDirectoryGroups()]);
  return <UserCreate accounts={accounts} units={units} groups={groups} />;
}
