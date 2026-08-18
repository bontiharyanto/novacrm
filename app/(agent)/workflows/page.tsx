import { WorkflowDashboard } from '@/components/workflows/workflow-dashboard';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function WorkflowPage() {
  const session = await getSessionProfile();
  return <WorkflowDashboard canDelete={Boolean(session && canRole(session.profile.role, 'delete', 'Workflow'))} />;
}
