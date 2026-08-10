'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TicketItem = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'on_hold' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeName?: string;
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

const statusColors: Record<string, string> = {
  open: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  waiting: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  on_hold: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
};

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [status, setStatus] = useState<'open' | 'in_progress' | 'waiting' | 'on_hold' | 'resolved' | 'closed'>('open');
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('Agent');
  const [isSaving, setIsSaving] = useState(false);

  const loadTicket = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}`);
    const payload = await response.json();
    const nextTicket = payload.data as TicketItem | null;
    setTicket(nextTicket);
    if (nextTicket) {
      setStatus(nextTicket.status);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  async function handleStatusUpdate() {
    if (!ticket) return;
    setIsSaving(true);
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      await loadTicket();
    }
    setIsSaving(false);
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, comment }),
    });

    if (response.ok) {
      setComment('');
      await loadTicket();
    }
  }

  const slaLabel = (() => {
    if (!ticket?.dueDate) return 'No SLA set';
    const due = new Date(ticket.dueDate).getTime();
    const diffHours = (due - Date.now()) / (1000 * 60 * 60);
    if (diffHours <= 0) return 'SLA breached';
    if (diffHours <= 24) return 'SLA at risk';
    return 'Within SLA';
  })();

  if (!ticket) {
    return <div className="p-6 text-zinc-400">Loading ticket...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400">Ticket</p>
          <h1 className="text-3xl font-bold text-white">#{ticket.id}</h1>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusColors[ticket.status] ?? 'bg-zinc-800 text-zinc-200'}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{ticket.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-300">
            <p>{ticket.description || 'No description provided.'}</p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-zinc-400">
              <div><span className="text-zinc-500">Requester:</span> {ticket.requesterName}</div>
              {ticket.requesterEmail && <div><span className="text-zinc-500">Email:</span> {ticket.requesterEmail}</div>}
              {ticket.requesterPhone && <div><span className="text-zinc-500">WhatsApp:</span> {ticket.requesterPhone}</div>}
              {ticket.assigneeName && <div><span className="text-zinc-500">Assignee:</span> {ticket.assigneeName}</div>}
              {ticket.dueDate && <div><span className="text-zinc-500">Due:</span> {new Date(ticket.dueDate).toLocaleString()}</div>}
              <div><span className="text-zinc-500">SLA:</span> {slaLabel}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="on_hold">On Hold</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <Button onClick={() => void handleStatusUpdate()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save status'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Agent name"
          />
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Write a comment or update"
          />
          <Button onClick={() => void handleAddComment()} disabled={!comment.trim()}>Add comment</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticket.comments.length === 0 ? (
            <p className="text-sm text-zinc-400">No comments yet.</p>
          ) : (
            ticket.comments.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>{item.author}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-zinc-200">{item.comment}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
