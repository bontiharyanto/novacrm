import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { TicketDashboard } from '@/components/tickets/ticket-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { redirect } from 'next/navigation';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { homePathForRole } from '@/lib/rbac/roles';

export default async function TicketsPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (!(await canAccessConfiguredCapability('read', 'OperationsServiceDesk'))) {
    redirect(homePathForRole(session.profile.role));
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-3 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TicketDashboard currentUserId={session?.userId ?? ''} role={session?.profile.role} />
    </Suspense>
  );
}
