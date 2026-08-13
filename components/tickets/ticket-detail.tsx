'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeId } from '@/lib/utils/dates';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { CommentEditor, CommentHtml } from '@/components/tickets/comment-editor';
import type { TicketStatus } from '@/lib/tickets/schema';

type TicketItem = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
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
  waiting: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  hold: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
};

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [status, setStatus] = useState<TicketStatus>('open');
  const [comment, setComment] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [author, setAuthor] = useState('Agent');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  useRealtimeTable('tickets', loadTicket);
  useRealtimeTable('ticket_comments', loadTicket);

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
      setEditorKey((value) => value + 1);
      await loadTicket();
    }
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    const presign = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
    });
    const payload = await presign.json();
    if (!presign.ok || !payload.data?.url) {
      setIsUploading(false);
      return;
    }

    await fetch(payload.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author,
        comment: `Attachment uploaded: ${file.name} (${payload.data.key})`,
      }),
    });

    await loadTicket();
    setIsUploading(false);
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
          <h1 className="font-mono text-3xl font-bold text-white">#{ticket.id.slice(0, 8)}</h1>
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
            <div className="grid gap-3 text-xs text-zinc-400 sm:grid-cols-2">
              <div><span className="text-zinc-500">Requester:</span> {ticket.requesterName}</div>
              {ticket.requesterEmail && <div><span className="text-zinc-500">Email:</span> {ticket.requesterEmail}</div>}
              {ticket.requesterPhone && <div><span className="text-zinc-500">WhatsApp:</span> {ticket.requesterPhone}</div>}
              {ticket.assigneeName && <div><span className="text-zinc-500">Assignee:</span> {ticket.assigneeName}</div>}
              {ticket.dueDate && <div><span className="text-zinc-500">Due:</span> {new Date(ticket.dueDate).toLocaleString('id-ID')}</div>}
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
              onChange={(event) => setStatus(event.target.value as TicketStatus)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="hold">Hold</option>
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
          <CommentEditor key={editorKey} value={comment} onChange={setComment} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void handleAddComment()} disabled={!comment.trim()}>Add comment</Button>
            <label className="cursor-pointer text-xs text-blue-300">
              {isUploading ? 'Uploading...' : 'Attach file (MinIO)'}
              <input
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
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
                  <span>{formatRelativeId(item.createdAt)}</span>
                </div>
                <CommentHtml html={item.comment} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
