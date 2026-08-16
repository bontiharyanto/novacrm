'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { PendingCsatTicket } from '@/lib/csat/schema';

function isCsatAllowedPath(pathname: string, pending: PendingCsatTicket[]) {
  if (pathname === '/portal/account' || pathname.startsWith('/portal/account/')) return true;
  const match = pathname.match(/^\/portal\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return Boolean(match && pending.some((ticket) => ticket.id === match[1]));
}

export function PortalCsatGate({
  pending,
  children,
}: {
  pending: PendingCsatTicket[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const next = pending[0];
  const allowed = !next || isCsatAllowedPath(pathname, pending);

  useEffect(() => {
    if (!next || allowed) return;
    router.replace(`/portal/${next.id}?rate=1`);
  }, [allowed, next, router]);

  if (!allowed) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return children;
}
