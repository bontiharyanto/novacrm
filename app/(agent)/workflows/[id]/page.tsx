import { WorkflowEditor } from '@/components/workflows/workflow-editor';

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  return <WorkflowEditor ruleId={params.id} />;
}
