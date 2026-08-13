import { RopaEditor } from '@/components/governance/ropa-editor';

export default function RopaDetailPage({ params }: { params: { id: string } }) {
  return <RopaEditor activityId={params.id} />;
}
