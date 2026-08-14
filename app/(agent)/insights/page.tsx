import { redirect } from 'next/navigation';
import { InsightsBoardView } from '@/components/insights/insights-board';
import { getInsightsBoard } from '@/lib/insights/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function InsightsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) redirect('/dashboard');
  const board = await getInsightsBoard();
  if (!board) redirect('/dashboard');
  return <InsightsBoardView initial={board} role={session.profile.role} />;
}
