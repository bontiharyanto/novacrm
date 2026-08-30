import { getSessionProfile } from '@/lib/auth/session';
import { TicketDetail } from '@/components/tickets/ticket-detail';
import { canRole } from '@/lib/rbac/ability';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  return (
    <TicketDetail
      ticketId={params.id}
      currentUserId={session?.userId ?? ''}
      currentUserName={session?.profile.fullName ?? ''}
      canEditTicket={Boolean(session && canRole(session.profile.role, 'update', 'Ticket'))}
      canCreateTaskActivity={Boolean(session && canRole(session.profile.role, 'create', 'TaskActivity'))}
      canPublishActivity={Boolean(session && canRole(session.profile.role, 'update', 'DeliveryPublish'))}
    />
  );
}
