import { getSessionProfile } from '@/lib/auth/session';
import { TicketDetail } from '@/components/tickets/ticket-detail';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  return <TicketDetail ticketId={params.id} currentUserId={session?.userId ?? ''} />;
}
