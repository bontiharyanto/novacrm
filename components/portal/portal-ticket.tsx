'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { CommentEditor, CommentHtml } from '@/components/tickets/comment-editor';
import { ActivityEntry, type ActivityComment } from '@/components/tickets/activity-entry';
import { formatRelativeId } from '@/lib/utils/dates';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedStage } from '@/lib/i18n/labels';
import { displayTicketNumber, isTicketType, type TicketType } from '@/lib/tickets/process';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';
import { CsatSurvey } from '@/components/csat/csat-survey';
import type { CsatResponse } from '@/lib/csat/schema';
import { PortalTasksProgress } from '@/components/portal/portal-tasks-progress';

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
  comments: ActivityComment[];
  csatScore?: number;
  csatComment?: string;
  csatSource?: 'customer' | 'auto_timeout';
};

const statusTone: Record<TicketStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export function PortalTicket({
  ticketId,
  csatRemaining = 0,
  nextCsatId,
}: {
  ticketId: string;
  csatRemaining?: number;
  nextCsatId?: string;
}) {
  const { t, locale } = useI18n();
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
      body: JSON.stringify({ comment }),
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
      <div className="mx-auto grid max-w-6xl gap-4 p-4 pb-safe md:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const type = isTicketType(ticket.type) ? ticket.type : 'incident';
  const csatRequired =
    (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.csatScore;

  const survey = (
    <CsatSurvey
      ticketId={ticket.id}
      status={ticket.status}
      canSubmit
      required={csatRequired}
      remaining={csatRemaining}
      nextTicketId={nextCsatId}
      initial={
            ticket.csatScore
              ? ({
                  ticketId: ticket.id,
                  score: ticket.csatScore as CsatResponse['score'],
                  comment: ticket.csatComment,
                  createdAt: ticket.createdAt,
                  source: ticket.csatSource,
                } satisfies CsatResponse)
              : null
      }
    />
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 pb-safe md:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
      <div className="space-y-6">
        <div>
          {!csatRequired ? (
            <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.myTickets}
            </Link>
          ) : null}
          <p className={csatRequired ? 'font-mono text-[12px] text-zinc-600' : 'mt-3 font-mono text-[12px] text-zinc-600'}>
            {displayTicketNumber(ticket.number, ticket.id)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{ticket.title}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={type} />
            <Badge tone={statusTone[ticket.status]}>{localizedStage(t, type, ticket.status)}</Badge>
          </div>
        </div>

        {csatRequired ? survey : null}

        <section className="nova-surface overflow-hidden rounded-xl border p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.tickets.process}</p>
          <ProcessStrip type={type} status={ticket.status} />
        </section>

        <section className="nova-surface overflow-hidden rounded-xl border p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.description}</p>
          <div className="mt-3 text-sm leading-relaxed text-zinc-300">
            {ticket.description ? <CommentHtml html={ticket.description} /> : t.portal.noDescription}
          </div>
        </section>

        <PortalTasksProgress ticketId={ticket.id} />

        {!csatRequired ? survey : null}

        <section className="nova-surface overflow-hidden rounded-xl border">
          <div className="border-b border-zinc-800 px-5 py-3">
            <p className="text-[13px] font-medium text-zinc-200">{t.portal.updates}</p>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-[12px] text-zinc-600">
              {t.portal.opened.replace('{{time}}', formatRelativeId(ticket.createdAt, locale))}
            </p>
            {ticket.comments.map((item) => (
              <ActivityEntry key={item.id} item={item} />
            ))}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <CommentEditor key={editorKey} value={comment} onChange={setComment} />
              <Button size="sm" onClick={() => void handleAddComment()} disabled={isSaving || !comment.trim()}>
                {isSaving ? t.portal.sending : t.portal.addUpdate}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="nova-surface overflow-hidden rounded-xl border p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.tickets.properties}</p>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">{t.portal.status}</dt>
              <dd className="mt-1 text-sm text-zinc-50">{localizedStage(t, type, ticket.status)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">{t.tickets.priorityTitle}</dt>
              <dd className="mt-1 text-sm text-zinc-50">{t.tickets.priority[ticket.priority]}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">{t.tickets.requester}</dt>
              <dd className="mt-1 text-sm text-zinc-50">{ticket.requesterName}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
