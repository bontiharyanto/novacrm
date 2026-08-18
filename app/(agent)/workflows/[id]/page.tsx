import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

export default async function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  return (
    <WorkflowEditor
      ruleId={params.id}
      canDelete={Boolean(session && canRole(session.profile.role, 'delete', 'Workflow'))}
    />
  );
}
