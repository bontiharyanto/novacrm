import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role !== 'customer') {
    redirect('/dashboard');
  }

  return <PortalShell fullName={session.profile.fullName}>{children}</PortalShell>;
}
