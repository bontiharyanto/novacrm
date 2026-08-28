import { ReportsPage } from '@/components/reports/reports-page';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';
import { redirect } from 'next/navigation';

export default async function AgentReportsPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsReports'))) {
    redirect(homePathForRole(session.profile.role));
  }
  return (
    <ReportsPage canWorkforce={Boolean(session && canRole(session.profile.role, 'create', 'Wfm'))} />
  );
}
