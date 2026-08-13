import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import { WorkflowPicker } from '@/components/workflows/workflow-picker';

export default function NewWorkflowPage({ searchParams }: { searchParams: { template?: string } }) {
  if (!searchParams.template) {
    return <WorkflowPicker />;
  }
  return <WorkflowEditor template={searchParams.template} />;
}
