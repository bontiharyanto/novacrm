import { getSessionProfile } from '@/lib/auth/session';
import { PortalTicket } from '@/components/portal/portal-ticket';
import { listPendingCsatTickets } from '@/lib/csat/actions';

export default async function PortalTicketPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  const pendingCsat = await listPendingCsatTickets();
  const others = pendingCsat.filter((ticket) => ticket.id !== params.id);
  return (
    <PortalTicket
      ticketId={params.id}
      authorName={session?.profile.fullName ?? 'Customer'}
      csatRemaining={others.length}
      nextCsatId={others[0]?.id}
    />
  );
}
