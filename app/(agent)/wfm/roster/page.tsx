import { redirect } from 'next/navigation';
import { addDays, format, startOfWeek } from 'date-fns';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignmentGroups } from '@/lib/org/actions';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { listRoster, listShiftTemplates } from '@/lib/wfm/actions';
import { WfmRoster } from '@/components/wfm/wfm-roster';

export default async function WfmRosterPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const fromDate = format(weekStart, 'yyyy-MM-dd');
  const toDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const [entries, templates, groups, staff] = await Promise.all([
    listRoster(fromDate, toDate),
    listShiftTemplates(),
    listAssignmentGroups(),
    listAssignableAgents(),
  ]);
  return (
    <WfmRoster
      entries={entries}
      templates={templates}
      groups={groups.map((group) => ({ id: group.id, name: group.name }))}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      canEdit={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
