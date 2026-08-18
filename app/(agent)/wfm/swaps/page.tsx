import { redirect } from 'next/navigation';
import { addDays, format, startOfWeek } from 'date-fns';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignmentGroups } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { listRoster } from '@/lib/wfm/actions';
import { listShiftSwaps, listWfmAttendance, listWfmCoverage } from '@/lib/wfm/swap-actions';
import { WfmSwaps } from '@/components/wfm/wfm-swaps';

export default async function WfmSwapsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const fromDate = format(weekStart, 'yyyy-MM-dd');
  const toDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const rosterTo = format(addDays(new Date(), 21), 'yyyy-MM-dd');
  const canApprove = canRole(session.profile.role, 'create', 'Wfm');
  const canRequest = canRole(session.profile.role, 'update', 'Wfm');

  const [swaps, groups, staff, roster, coverage, attendance] = await Promise.all([
    listShiftSwaps(),
    listAssignmentGroups(),
    listAssignableAgents(),
    listRoster(fromDate, rosterTo),
    canApprove ? listWfmCoverage(fromDate, toDate) : Promise.resolve([]),
    canApprove ? listWfmAttendance(fromDate, toDate) : Promise.resolve([]),
  ]);

  return (
    <WfmSwaps
      swaps={swaps}
      groups={groups.map((group) => ({ id: group.id, name: group.name }))}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      roster={roster}
      coverage={coverage}
      attendance={attendance}
      currentUserId={session.userId}
      canRequest={canRequest}
      canApprove={canApprove}
    />
  );
}
