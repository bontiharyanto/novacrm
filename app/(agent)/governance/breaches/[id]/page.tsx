import { BreachRecord } from '@/components/governance/breach-record';

export default function BreachDetailPage({ params }: { params: { id: string } }) {
  return <BreachRecord breachId={params.id} />;
}
