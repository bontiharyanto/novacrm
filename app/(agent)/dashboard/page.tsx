import { OpsDashboard } from '@/components/reports/ops-dashboard';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!canRole(session.profile.role, 'read', 'OperationsDashboard')) {
    redirect('/delivery/dashboard');
  }
  return <OpsDashboard />;
}
