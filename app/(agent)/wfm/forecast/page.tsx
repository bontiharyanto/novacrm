import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { getWfmForecast } from '@/lib/wfm/actions';
import { WfmForecast } from '@/components/wfm/wfm-forecast';

export default async function WfmForecastPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const { buckets, adherence } = await getWfmForecast();
  return (
    <WfmForecast
      buckets={buckets}
      adherence={adherence}
      canManageWfm={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
