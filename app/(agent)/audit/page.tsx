import { AuditBrowse } from '@/components/audit/audit-browse';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';

export default async function AuditPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsAudit'))) {
    redirect(homePathForRole(session.profile.role));
  }
  return <AuditBrowse />;
}
