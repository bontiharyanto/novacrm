import { CabRecord } from '@/components/cab/cab-record';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';

export default async function CabDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsCab'))) {
    redirect(homePathForRole(session.profile.role));
  }
  return <CabRecord ticketId={params.id} />;
}
