import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listShiftTemplateCatalog } from '@/lib/wfm/actions';
import { WfmShifts } from '@/components/wfm/wfm-shifts';

export default async function WfmShiftsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const templates = await listShiftTemplateCatalog();
  return (
    <WfmShifts templates={templates} canEdit={canRole(session.profile.role, 'create', 'Wfm')} />
  );
}
