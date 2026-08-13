import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { PortalPrivacyCreate } from '@/components/portal/portal-privacy-create';

export default async function PortalPrivacyNewPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  return <PortalPrivacyCreate fullName={session.profile.fullName} email={session.profile.email} />;
}
