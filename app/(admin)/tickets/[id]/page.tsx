import { AdminShell } from '@/components/layout/admin-shell';
import { TicketDetail } from '@/components/tickets/ticket-detail';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell>
      <TicketDetail ticketId={params.id} />
    </AdminShell>
  );
}
