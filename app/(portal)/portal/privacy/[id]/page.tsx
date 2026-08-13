import { PortalPrivacyDetail } from '@/components/portal/portal-privacy-detail';

export default function PortalPrivacyDetailPage({ params }: { params: { id: string } }) {
  return <PortalPrivacyDetail requestId={params.id} />;
}
