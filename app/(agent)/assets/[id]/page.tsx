import { AssetDetail } from '@/components/asset/asset-detail';

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  return <AssetDetail assetId={params.id} />;
}
