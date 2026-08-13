import { DsarRecord } from '@/components/governance/dsar-record';

export default function DsarDetailPage({ params }: { params: { id: string } }) {
  return <DsarRecord requestId={params.id} />;
}
