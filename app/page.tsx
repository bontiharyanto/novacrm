import { AdminShell } from '@/components/layout/admin-shell';
import { TicketDashboard } from '@/components/tickets/ticket-dashboard';

export default function HomePage() {
  return (
    <AdminShell>
      <TicketDashboard />
    </AdminShell>
  );
}
