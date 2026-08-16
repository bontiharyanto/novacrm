import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { PortalPrivacyCreate } from '@/components/portal/portal-privacy-create';
import { requirePublishedPrivacy } from '@/lib/governance/privacy-gate';

export default async function PortalPrivacyNewPage() {
  await requirePublishedPrivacy();
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  return <PortalPrivacyCreate fullName={session.profile.fullName} email={session.profile.email} />;
}
