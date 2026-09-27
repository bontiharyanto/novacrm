import { CatalogItemEditor } from '@/components/catalog/catalog-item-editor';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function CatalogItemPage({ params }: { params: { id: string } }) {
  return (
    <CatalogItemEditor
      itemId={params.id}
      canDelete={await canAccessConfiguredCapability('delete', 'Catalog')}
    />
  );
}
