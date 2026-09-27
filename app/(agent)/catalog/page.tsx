import { CatalogDashboard } from '@/components/catalog/catalog-dashboard';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function CatalogPage() {
  const session = await getSessionProfile();
  return (
    <CatalogDashboard
      canCopyCatalog={session?.profile.role === 'superadmin'}
      canDelete={await canAccessConfiguredCapability('delete', 'Catalog')}
    />
  );
}
