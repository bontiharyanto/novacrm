import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listWfmOccupancy } from '@/lib/wfm/actions';
import { WfmBoard } from '@/components/wfm/wfm-board';

export default async function WfmPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const rows = await listWfmOccupancy();
  return <WfmBoard rows={rows} canSetPresence={canRole(session.profile.role, 'update', 'Wfm')} canManageWfm={canRole(session.profile.role, 'create', 'Wfm')} />;
}
