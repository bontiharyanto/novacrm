import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { TicketDashboard } from '@/components/tickets/ticket-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default async function TicketsPage() {
  const session = await getSessionProfile();

  return (
    <Suspense
      fallback={
        <div className="space-y-3 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TicketDashboard currentUserId={session?.userId ?? ''} />
    </Suspense>
  );
}
