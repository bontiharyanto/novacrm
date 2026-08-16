import { PortalPrivacyDetail } from '@/components/portal/portal-privacy-detail';
import { requirePublishedPrivacy } from '@/lib/governance/privacy-gate';

export default async function PortalPrivacyDetailPage({ params }: { params: { id: string } }) {
  await requirePublishedPrivacy();
  return <PortalPrivacyDetail requestId={params.id} />;
}
