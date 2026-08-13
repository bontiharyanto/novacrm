import { CabRecord } from '@/components/cab/cab-record';

export default function CabDetailPage({ params }: { params: { id: string } }) {
  return <CabRecord ticketId={params.id} />;
}
