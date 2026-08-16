import { getSessionProfile } from '@/lib/auth/session';
import { PortalHome } from '@/components/portal/portal-home';

export default async function PortalPage() {
  const session = await getSessionProfile();
  const firstName = session?.profile.fullName?.trim().split(/\s+/)[0] ?? '';
  return <PortalHome firstName={firstName} />;
}
