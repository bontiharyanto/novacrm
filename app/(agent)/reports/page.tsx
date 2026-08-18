import { ReportsPage } from '@/components/reports/reports-page';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function AgentReportsPage() {
  const session = await getSessionProfile();
  return (
    <ReportsPage canWorkforce={Boolean(session && canRole(session.profile.role, 'create', 'Wfm'))} />
  );
}
