import { listDirectoryUsers } from '@/lib/users/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { UsersDashboard } from '@/components/users/users-dashboard';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) {
    redirect('/dashboard');
  }
  const users = await listDirectoryUsers();
  return <UsersDashboard users={users} canCreate={canRole(session.profile.role, 'create', 'User')} />;
}
