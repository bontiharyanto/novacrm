import { PortalPassword } from '@/components/portal/portal-password';

export default function PortalAccountPage({ searchParams }: { searchParams?: { expired?: string } }) {
  return <PortalPassword forced={searchParams?.expired === '1'} />;
}
