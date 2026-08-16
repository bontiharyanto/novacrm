import { PortalPrivacy } from '@/components/portal/portal-privacy';
import { requirePublishedPrivacy } from '@/lib/governance/privacy-gate';

export default async function PortalPrivacyPage() {
  await requirePublishedPrivacy();
  return <PortalPrivacy />;
}
