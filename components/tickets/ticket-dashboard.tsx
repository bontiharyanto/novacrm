'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketKanban } from '@/components/tickets/ticket-kanban';
import { TicketTable } from '@/components/tickets/ticket-table';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { evaluateTicketSla } from '@/lib/tickets/sla';
import {
  TICKET_TYPES,
  isTicketType,
  queueFilters,
  ticketTypeMeta,
  type QueueFilter,
  type TicketType,
} from '@/lib/tickets/process';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';
import type { TicketPendingReason } from '@/lib/tickets/pending';
import { cn } from '@/lib/utils';

type TicketItem = {
  id: string;
  number: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  groupId?: string;
  groupName?: string;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  pendingReason?: TicketPendingReason;
  pendingNote?: string;
  assetId?: string;
  assetName?: string;
  assetTag?: string;
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

function normalizeTicket(row: Partial<TicketItem> & { id: string; title: string }): TicketItem {
  return {
    id: row.id,
    number: row.number || `#${row.id.slice(0, 8)}`,
    title: row.title,
    description: row.description ?? '',
    type: isTicketType(row.type) ? row.type : 'incident',
    status: row.status ?? 'open',
    priority: row.priority ?? 'medium',
    dueDate: row.dueDate,
    requesterName: row.requesterName ?? 'Customer',
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    groupId: row.groupId,
    groupName: row.groupName,
    slaResponseAt: row.slaResponseAt,
    slaResolveBy: row.slaResolveBy,
    slaRespondedAt: row.slaRespondedAt,
    slaPausedAt: row.slaPausedAt,
    slaResponseMinutes: row.slaResponseMinutes,
    slaResolveMinutes: row.slaResolveMinutes,
    pendingReason: row.pendingReason,
    pendingNote: row.pendingNote,
    assetId: row.assetId,
    assetName: row.assetName,
    assetTag: row.assetTag,
    createdAt: row.createdAt ?? new Date().toISOString(),
    comments: row.comments ?? [],
  };
}

export function TicketDashboard({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const queueParam = searchParams.get('queue');
  const activeType = isTicketType(typeParam) ? typeParam : 'all';
  const activeQueue: QueueFilter =
    queueParam === 'mine' || queueParam === 'unassigned' || queueParam === 'queue' ? queueParam : 'all';

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'board'>('table');
  const newTicketHref = activeType === 'all' ? '/tickets/new' : `/tickets/new?type=${activeType}`;

  const loadTickets = useCallback(async () => {
    const response = await fetch('/api/tickets');
    const payload = await response.json();
    setTickets(((payload.data ?? []) as TicketItem[]).map((row) => normalizeTicket(row)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTickets();
    void fetch('/api/org/groups')
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload.data ?? []) as Array<{ id: string; isMember?: boolean }>;
        setMyGroupIds(rows.filter((row) => row.isMember).map((row) => row.id));
      })
      .catch(() => setMyGroupIds([]));
  }, [loadTickets]);

  useRealtimeTable('tickets', loadTickets);
  useRealtimeTable('ticket_comments', loadTickets);

  function setFilter(next: { type?: string; queue?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const type = next.type ?? (activeType === 'all' ? '' : activeType);
    const queue = next.queue ?? (activeQueue === 'all' ? '' : activeQueue);
    if (type) params.set('type', type);
    else params.delete('type');
    if (queue) params.set('queue', queue);
    else params.delete('queue');
    const query = params.toString();
    router.replace(query ? `/tickets?${query}` : '/tickets');
  }

  async function handleStatusChange(ticketId: string, status: TicketStatus) {
    setTickets((current) => current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)));
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      await loadTickets();
    }
  }

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (activeType !== 'all' && ticket.type !== activeType) return false;
      if (activeQueue === 'mine' && ticket.assigneeId !== currentUserId) return false;
      if (activeQueue === 'queue' && (!ticket.groupId || !myGroupIds.includes(ticket.groupId))) return false;
      if (activeQueue === 'unassigned' && ticket.assigneeId) return false;
      return true;
    });
  }, [tickets, activeType, activeQueue, currentUserId, myGroupIds]);

  const openCount = visibleTickets.filter((ticket) => ticket.status === 'open').length;
  const unassignedCount = tickets.filter((ticket) => !ticket.assigneeId).length;
  const atRiskCount = visibleTickets.filter((ticket) => {
    const level = evaluateTicketSla(ticket).overall;
    return level === 'risk' || level === 'breached';
  }).length;
  const mineCount = tickets.filter((ticket) => ticket.assigneeId === currentUserId).length;
  const queueCount = tickets.filter((ticket) => ticket.groupId && myGroupIds.includes(ticket.groupId)).length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Service desk</p>
          <h1 className="text-2xl font-semibold text-white">
            {activeType === 'all' ? 'Tickets' : ticketTypeMeta[activeType].label}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-800 p-0.5">
            <Button size="sm" variant={view === 'table' ? 'default' : 'ghost'} onClick={() => setView('table')}>
              <List className="h-3.5 w-3.5" /> List
            </Button>
            <Button size="sm" variant={view === 'board' ? 'default' : 'ghost'} onClick={() => setView('board')}>
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </Button>
          </div>
          <Link
            href={newTicketHref}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter({ type: '' })}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
            activeType === 'all'
              ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
          )}
        >
          All processes
        </button>
        {TICKET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter({ type })}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
              activeType === type
                ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
            )}
          >
            {ticketTypeMeta[type].label}
            <span className="ml-1.5 font-mono text-[10px] text-zinc-500">
              {tickets.filter((ticket) => ticket.type === type).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {queueFilters.map((queue) => (
          <button
            key={queue.id}
            type="button"
            onClick={() => setFilter({ queue: queue.id === 'all' ? '' : queue.id })}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
              activeQueue === queue.id
                ? 'border-zinc-600 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
            )}
          >
            {queue.label}
            <span className="ml-1.5 font-mono text-[10px] text-zinc-500">
              {queue.id === 'all'
                ? tickets.length
                : queue.id === 'mine'
                  ? mineCount
                  : queue.id === 'queue'
                    ? queueCount
                    : unassignedCount}
            </span>
          </button>
        ))}
      </div>

      {activeType !== 'all' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            {ticketTypeMeta[activeType].description}
          </p>
          <ProcessStrip type={activeType} status="open" />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'In queue', value: visibleTickets.length, className: 'text-zinc-500' },
          { label: 'New', value: openCount, className: 'text-sky-400' },
          { label: 'Unassigned', value: unassignedCount, className: 'text-amber-400' },
          { label: 'SLA risk', value: atRiskCount, className: 'text-rose-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-[11px] uppercase tracking-[0.16em] ${stat.className}`}>{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{loading ? '—' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : view === 'table' ? (
        <TicketTable tickets={visibleTickets} />
      ) : (
        <TicketKanban tickets={visibleTickets} onStatusChange={(ticketId, status) => void handleStatusChange(ticketId, status)} />
      )}
    </div>
  );
}
