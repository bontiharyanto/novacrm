import { CmdbDetail } from '@/components/cmdb/cmdb-detail';

export default function CmdbDetailPage({ params }: { params: { id: string } }) {
  return <CmdbDetail itemId={params.id} />;
}
