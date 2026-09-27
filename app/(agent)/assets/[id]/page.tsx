import { AssetDetail } from '@/components/asset/asset-detail';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  return (
    <AssetDetail
      assetId={params.id}
      canDelete={await canAccessConfiguredCapability('delete', 'Asset')}
    />
  );
}
