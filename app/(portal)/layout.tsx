import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/portal-shell';
import { getTenantConfig } from '@/lib/tenants/config';
import { accentCss } from '@/lib/tenants/accent';
import { AccentProvider } from '@/components/layout/accent-provider';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role !== 'customer') {
    redirect('/dashboard');
  }

  const tenant = await getTenantConfig();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: accentCss(tenant?.accentColor) }} />
      <AccentProvider color={tenant?.accentColor} />
      <PortalShell fullName={session.profile.fullName} userId={session.userId}>
        {children}
      </PortalShell>
    </>
  );
}
