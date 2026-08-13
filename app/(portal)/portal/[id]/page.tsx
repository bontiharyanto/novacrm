import { getSessionProfile } from '@/lib/auth/session';
import { PortalTicket } from '@/components/portal/portal-ticket';

export default async function PortalTicketPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  return <PortalTicket ticketId={params.id} authorName={session?.profile.fullName ?? 'Customer'} />;
}
