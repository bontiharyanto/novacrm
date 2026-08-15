import { notFound, redirect } from 'next/navigation';
import { getDirectoryUser, listDirectoryGroups, listHomeUnits } from '@/lib/users/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isStaffRole, isTenantAdminRole } from '@/lib/rbac/roles';
import { UserDetail } from '@/components/users/user-detail';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'User')) {
    redirect('/dashboard');
  }
  const [user, units, groups] = await Promise.all([
    getDirectoryUser(params.id),
    listHomeUnits(),
    listDirectoryGroups(),
  ]);
  if (!user) notFound();

  return (
    <UserDetail
      user={user}
      units={units}
      groups={groups}
      canEdit={canRole(session.profile.role, 'update', 'User')}
      canResetMfa={isTenantAdminRole(session.profile.role) && isStaffRole(user.role)}
      actorRole={session.profile.role}
    />
  );
}
