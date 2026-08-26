import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/portal-shell';
import { PortalCsatGate } from '@/components/portal/portal-csat-gate';
import { getTenantConfig } from '@/lib/tenants/config';
import { resolveTenantLogoUrl } from '@/lib/tenants/logo';
import { accentCss } from '@/lib/tenants/accent';
import { AccentProvider } from '@/components/layout/accent-provider';
import { getPrivacySettings } from '@/lib/governance/actions';
import { listPendingCsatTickets } from '@/lib/csat/actions';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role !== 'customer') {
    redirect('/dashboard');
  }

  const [tenant, privacy, pendingCsat] = await Promise.all([
    getTenantConfig(),
    getPrivacySettings(),
    listPendingCsatTickets(),
  ]);
  const logoUrl = tenant
    ? await resolveTenantLogoUrl(tenant.id, tenant.logoObjectKey)
    : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: accentCss(tenant?.accentColor) }} />
      <AccentProvider color={tenant?.accentColor} />
      <PortalShell
        fullName={session.profile.fullName}
        userId={session.userId}
        privacyEnabled={Boolean(privacy?.isPublished)}
        pendingCsat={pendingCsat}
        idleTimeoutMinutes={tenant?.idleTimeoutMinutes ?? 30}
        logoUrl={logoUrl}
        tenantName={tenant?.name}
      >
        <PortalCsatGate pending={pendingCsat}>{children}</PortalCsatGate>
      </PortalShell>
    </>
  );
}
