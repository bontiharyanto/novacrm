import { Suspense } from 'react';
import { getSessionProfile } from '@/lib/auth/session';
import { TicketCreate } from '@/components/tickets/ticket-create';
import { Skeleton } from '@/components/ui/skeleton';
import { getAccountScope } from '@/lib/accounts/scope';

export default async function NewTicketPage() {
  const session = await getSessionProfile();
  const scope = await getAccountScope(session);

  return (
    <Suspense
      fallback={
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[480px] w-full" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      }
    >
      <TicketCreate
        currentUserId={session?.userId ?? ''}
        accounts={scope.accounts}
        defaultAccountId={scope.account?.id ?? (scope.accounts.length === 1 ? scope.accounts[0].id : '')}
      />
    </Suspense>
  );
}
