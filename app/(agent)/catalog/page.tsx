import { CatalogDashboard } from '@/components/catalog/catalog-dashboard';
import { getSessionProfile } from '@/lib/auth/session';

export default async function CatalogPage() {
  const session = await getSessionProfile();
  return <CatalogDashboard canCopyCatalog={session?.profile.role === 'superadmin'} />;
}
