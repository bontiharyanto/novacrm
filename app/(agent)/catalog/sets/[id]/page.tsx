import { VariableSetEditor } from '@/components/catalog/variable-set-editor';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function VariableSetPage({ params }: { params: { id: string } }) {
  return (
    <VariableSetEditor
      setId={params.id}
      canDelete={await canAccessConfiguredCapability('delete', 'Catalog')}
    />
  );
}
