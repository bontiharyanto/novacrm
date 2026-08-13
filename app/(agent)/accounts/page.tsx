import { listAccounts } from '@/lib/accounts/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { AccountsDashboard } from '@/components/accounts/accounts-dashboard';

export default async function AccountsPage() {
  const session = await getSessionProfile();
  const accounts = await listAccounts();
  return (
    <AccountsDashboard
      accounts={accounts}
      canCreate={session ? canRole(session.profile.role, 'create', 'Account') : false}
    />
  );
}
