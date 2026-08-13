import { notFound, redirect } from 'next/navigation';
import { getAccountById, listAccountMembers, listTenantProfiles } from '@/lib/accounts/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { AccountDetail } from '@/components/accounts/account-detail';

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Account')) {
    redirect('/dashboard');
  }

  const account = await getAccountById(params.id);
  if (!account) notFound();

  const [members, profiles] = await Promise.all([listAccountMembers(account.id), listTenantProfiles()]);

  return (
    <AccountDetail
      account={account}
      members={members}
      profiles={profiles}
      canEdit={canRole(session.profile.role, 'update', 'Account')}
    />
  );
}
