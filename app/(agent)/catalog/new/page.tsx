import { CatalogItemEditor } from '@/components/catalog/catalog-item-editor';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function NewCatalogItemPage() {
  return <CatalogItemEditor canDelete={await canAccessConfiguredCapability('delete', 'Catalog')} />;
}
