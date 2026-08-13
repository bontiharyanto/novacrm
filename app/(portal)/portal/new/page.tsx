import { Suspense } from 'react';
import { PortalCreate } from '@/components/portal/portal-create';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalNewPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-[420px] w-full" /></div>}>
      <PortalCreate />
    </Suspense>
  );
}
