import { CabBoard } from '@/components/cab/cab-board';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';

export default async function CabPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsCab'))) {
    redirect(homePathForRole(session.profile.role));
  }
  return <CabBoard />;
}
