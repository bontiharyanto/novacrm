import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { AccountCreate } from '@/components/accounts/account-create';

export default async function NewAccountPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Account')) {
    redirect('/accounts');
  }
  return <AccountCreate />;
}
