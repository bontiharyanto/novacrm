'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SlaBadge } from '@/components/tickets/sla-badge';
import { PendingBadge } from '@/components/tickets/pending-badge';
import { TypeBadge } from '@/components/tickets/type-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelativeId } from '@/lib/utils/dates';
import { displayTicketNumber, type TicketType } from '@/lib/tickets/process';
import type { TicketPendingReason, TicketPriority, TicketStatus } from '@/lib/tickets/schema';

export type TicketRow = {
  id: string;
  number?: string;
  title: string;
  type?: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  requesterName: string;
  assigneeName?: string;
  groupName?: string;
  assetName?: string;
  assetTag?: string;
  accountName?: string;
  accountCode?: string;
  dueDate?: string;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  pendingReason?: TicketPendingReason;
  pendingNote?: string;
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

const priorityTone: Record<TicketPriority, 'success' | 'warning' | 'danger' | 'neutral'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function TicketTable({ tickets }: { tickets: TicketRow[] }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) =>
      [
        ticket.id,
        ticket.number ?? '',
        ticket.title,
        ticket.type ?? '',
        ticket.status,
        ticket.priority,
        ticket.requesterName,
        ticket.assigneeName ?? '',
        ticket.groupName ?? '',
        ticket.accountName ?? '',
        ticket.accountCode ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [tickets, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter number, title, assignee..."
          className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Number</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Process</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Requester</th>
              <th className="px-3 py-2 font-medium">Assignee</th>
              <th className="px-3 py-2 font-medium">Group</th>
              <th className="px-3 py-2 font-medium">CI</th>
              <th className="px-3 py-2 font-medium">SLA</th>
              <th className="px-3 py-2 font-medium">Opened</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-zinc-500">
                  No tickets match this filter.
                </td>
              </tr>
            ) : (
              rows.map((ticket) => (
                <tr key={ticket.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                  <td className="px-3 py-2.5">
                    <Link href={`/tickets/${ticket.id}`} className="font-mono text-xs text-blue-300 hover:text-blue-200">
                      {displayTicketNumber(ticket.number, ticket.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-400">
                    {ticket.accountCode || ticket.accountName || '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/tickets/${ticket.id}`} className="text-sm text-zinc-50 hover:text-blue-200">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <TypeBadge type={ticket.type ?? 'incident'} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <Badge tone={statusTone[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
                      <PendingBadge reason={ticket.pendingReason} note={ticket.pendingNote} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{ticket.requesterName}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{ticket.assigneeName || 'Unassigned'}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{ticket.groupName || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{ticket.assetTag || ticket.assetName || '—'}</td>
                  <td className="px-3 py-2.5">
                    <SlaBadge
                      dueDate={ticket.dueDate}
                      status={ticket.status}
                      slaResponseAt={ticket.slaResponseAt}
                      slaResolveBy={ticket.slaResolveBy}
                      slaRespondedAt={ticket.slaRespondedAt}
                      slaPausedAt={ticket.slaPausedAt}
                      slaResponseMinutes={ticket.slaResponseMinutes}
                      slaResolveMinutes={ticket.slaResolveMinutes}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(ticket.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
