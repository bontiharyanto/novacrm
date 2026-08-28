import { redirect } from 'next/navigation';
import { InsightsBoardView } from '@/components/insights/insights-board';
import { getInsightsBoard } from '@/lib/insights/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';

export default async function InsightsPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsInsights'))) {
    redirect(homePathForRole(session.profile.role));
  }
  const board = await getInsightsBoard();
  if (!board) redirect('/dashboard');
  return <InsightsBoardView initial={board} role={session.profile.role} />;
}
