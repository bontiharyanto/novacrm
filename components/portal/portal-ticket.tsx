'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { CommentEditor, CommentHtml } from '@/components/tickets/comment-editor';
import { formatRelativeId } from '@/lib/utils/dates';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { displayTicketNumber, isTicketType, stageLabel, type TicketType } from '@/lib/tickets/process';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';

type TicketItem = {
  id: string;
  number?: string;
  title: string;
  description: string;
  type?: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate?: string;
  requesterName: string;
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

const statusTone: Record<TicketStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export function PortalTicket({ ticketId, authorName }: { ticketId: string; authorName: string }) {
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [comment, setComment] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const loadTicket = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}`);
    const payload = await response.json();
    setTicket(payload.data ?? null);
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useRealtimeTable('tickets', loadTicket);
  useRealtimeTable('ticket_comments', loadTicket);

  async function handleAddComment() {
    if (!comment.trim()) return;
    setIsSaving(true);
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: authorName, comment }),
    });
    if (response.ok) {
      setComment('');
      setEditorKey((value) => value + 1);
      await loadTicket();
    }
    setIsSaving(false);
  }

  if (!ticket) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const type = isTicketType(ticket.type) ? ticket.type : 'incident';

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> My tickets
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-white">{displayTicketNumber(ticket.number, ticket.id)}</h1>
            <TypeBadge type={type} />
            <Badge tone={statusTone[ticket.status]}>{stageLabel(type, ticket.status)}</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{ticket.title}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Process</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessStrip type={type} status={ticket.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-zinc-300">
            {ticket.description ? <CommentHtml html={ticket.description} /> : 'No description provided.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500">
              Opened {formatRelativeId(ticket.createdAt)}
            </div>
            {ticket.comments.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>{item.author}</span>
                  <span>{formatRelativeId(item.createdAt)}</span>
                </div>
                <CommentHtml html={item.comment} />
              </div>
            ))}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <CommentEditor key={editorKey} value={comment} onChange={setComment} />
              <Button size="sm" onClick={() => void handleAddComment()} disabled={isSaving || !comment.trim()}>
                {isSaving ? 'Sending...' : 'Add update'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Status</p>
            <p className="text-sm text-white">{stageLabel(type, ticket.status)}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Priority</p>
            <p className="text-sm capitalize text-white">{ticket.priority}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Requester</p>
            <p className="text-sm text-white">{ticket.requesterName}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
