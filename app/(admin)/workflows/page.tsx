import { AdminShell } from '@/components/layout/admin-shell';
import { WorkflowDashboard } from '@/components/workflows/workflow-dashboard';

export default function WorkflowPage() {
  return (
    <AdminShell>
      <WorkflowDashboard />
    </AdminShell>
  );
}
