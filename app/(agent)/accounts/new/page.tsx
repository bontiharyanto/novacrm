import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { AccountCreate } from '@/components/accounts/account-create';

export default async function NewAccountPage() {
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('create', 'Account'))) {
    redirect('/accounts');
  }
  return <AccountCreate />;
}
