import { listDirectoryUsers } from '@/lib/users/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { UsersDashboard } from '@/components/users/users-dashboard';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('read', 'User'))) {
    redirect('/dashboard');
  }
  const users = await listDirectoryUsers();
  return (
    <UsersDashboard
      users={users}
      canCreate={await canAccessConfiguredCapability('create', 'User')}
      canDelete={await canAccessConfiguredCapability('delete', 'User')}
    />
  );
}
