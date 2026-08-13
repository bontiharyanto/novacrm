'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/tickets/type-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeId } from '@/lib/utils/dates';
import { displayTicketNumber, isTicketType, stageLabel } from '@/lib/tickets/process';
import type { TicketStatus } from '@/lib/tickets/schema';

type TicketItem = {
  id: string;
  number?: string;
  title: string;
  type?: string;
  status: TicketStatus;
  createdAt: string;
};

const statusTone: Record<TicketStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export function PortalHome() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/tickets')
      .then((response) => response.json())
      .then((payload) => setTickets(payload.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Service portal</p>
          <h1 className="text-2xl font-semibold text-zinc-50">My tickets</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/catalog"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
          >
            Catalog
          </Link>
          <Link
            href="/portal/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New request
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-zinc-400">No tickets yet.</p>
            <Link href="/portal/catalog" className="mt-3 inline-flex text-sm text-blue-300 hover:text-blue-200">
              Open the service catalog
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {tickets.map((ticket) => {
            const type = isTicketType(ticket.type) ? ticket.type : 'incident';
            return (
              <Link
                key={ticket.id}
                href={`/portal/${ticket.id}`}
                className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-900/80"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-50">{ticket.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{displayTicketNumber(ticket.number, ticket.id)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={type} />
                    <Badge tone={statusTone[ticket.status]}>{stageLabel(type, ticket.status)}</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">{formatRelativeId(ticket.createdAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
