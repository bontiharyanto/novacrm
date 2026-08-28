import { DeliveryProjectDetail } from '@/components/delivery/delivery-project-detail';

export default function PortalProjectPage({ params }: { params: { id: string } }) {
  return <DeliveryProjectDetail projectId={params.id} readOnly />;
}
