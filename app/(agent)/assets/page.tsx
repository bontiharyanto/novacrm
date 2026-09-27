import { AssetDashboard } from '@/components/asset/asset-dashboard';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function AssetPage() {
  return <AssetDashboard canDelete={await canAccessConfiguredCapability('delete', 'Asset')} />;
}
