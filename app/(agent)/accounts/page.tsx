import { listAccounts } from '@/lib/accounts/actions';
import { AccountsDashboard } from '@/components/accounts/accounts-dashboard';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function AccountsPage() {
  const accounts = await listAccounts();
  return (
    <AccountsDashboard
      accounts={accounts}
      canCreate={await canAccessConfiguredCapability('create', 'Account')}
      canDelete={await canAccessConfiguredCapability('delete', 'Account')}
    />
  );
}
