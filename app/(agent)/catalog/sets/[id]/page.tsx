import { VariableSetEditor } from '@/components/catalog/variable-set-editor';

export default function VariableSetPage({ params }: { params: { id: string } }) {
  return <VariableSetEditor setId={params.id} />;
}
