import { TicketDetail } from '@/components/tickets/ticket-detail';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetail ticketId={params.id} />;
}
