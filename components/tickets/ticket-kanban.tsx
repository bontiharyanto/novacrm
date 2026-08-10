'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TicketItem = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'on_hold' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  createdAt: string;
  dueDate?: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

const columns: Array<{ key: TicketItem['status']; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const statusColors: Record<string, string> = {
  open: 'bg-sky-500/15 text-sky-300',
  in_progress: 'bg-amber-500/15 text-amber-300',
  waiting: 'bg-purple-500/15 text-purple-300',
  on_hold: 'bg-orange-500/15 text-orange-300',
  resolved: 'bg-emerald-500/15 text-emerald-300',
  closed: 'bg-zinc-500/15 text-zinc-300',
};

const priorityColors: Record<string, string> = {
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-orange-300',
  critical: 'text-rose-300',
};

export function TicketKanban({ tickets }: { tickets: TicketItem[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {columns.map((column) => {
        const items = tickets.filter((ticket) => ticket.status === column.key);

        return (
          <div key={column.key} className="min-h-[240px] rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-300">{column.label}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{items.length}</span>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-4 text-xs text-zinc-500">
                  No tickets in this stage
                </div>
              ) : (
                items.map((ticket) => (
                  <Card key={ticket.id} className="border-zinc-800 bg-zinc-950/70">
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">#{ticket.id}</CardTitle>
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusColors[ticket.status]}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3 text-sm text-zinc-300">
                      <p className="font-medium text-white">{ticket.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>{ticket.requesterName}</span>
                        <span className={priorityColors[ticket.priority] ?? 'text-zinc-300'}>{ticket.priority}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>{ticket.comments.length} comments</span>
                      </div>
                      {ticket.dueDate && (
                        <div className="text-[11px] text-zinc-400">Due: {new Date(ticket.dueDate).toLocaleDateString()}</div>
                      )}
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="inline-flex rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                      >
                        View
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
