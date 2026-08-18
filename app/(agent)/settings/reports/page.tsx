import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { getReportSchedule } from '@/lib/reports/schedule-actions';
import { ReportScheduleForm } from '@/components/settings/report-schedule-form';

export default async function ReportSchedulePage() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    redirect('/reports');
  }
  const initial = await getReportSchedule();
  return <ReportScheduleForm initial={initial} />;
}
