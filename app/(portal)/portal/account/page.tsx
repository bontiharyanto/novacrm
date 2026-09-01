import { PortalPassword } from '@/components/portal/portal-password';
import { PortalSiteSettings } from '@/components/portal/portal-site-settings';
import { getPortalSite } from '@/lib/profiles/portal-site';

export default async function PortalAccountPage({ searchParams }: { searchParams?: { expired?: string } }) {
  const forced = searchParams?.expired === '1';
  const site = forced ? null : await getPortalSite();

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 pb-safe md:p-8">
      {forced ? null : (
        <PortalSiteSettings
          initialSite={site?.data?.site ?? ''}
          initialClientIp={site?.data?.clientIp ?? ''}
        />
      )}
      <PortalPassword forced={forced} />
    </div>
  );
}
