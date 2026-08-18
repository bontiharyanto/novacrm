'use client';

import { Badge } from '@/components/ui/badge';
import { CommentHtml } from '@/components/tickets/comment-editor';
import { ActivityFile } from '@/components/tickets/activity-media';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';
import type { TicketAttachmentMeta, TicketCommentKind, TicketVisitMeta } from '@/lib/tickets/activity';

export type ActivityComment = {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
  kind?: TicketCommentKind;
  attachment?: TicketAttachmentMeta;
  visit?: TicketVisitMeta;
};

export function ActivityEntry({ item }: { item: ActivityComment }) {
  const { t, locale } = useI18n();
  const visit = item.kind === 'visit' || item.visit;
  const attachment = item.kind === 'attachment' || item.attachment;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          {item.author}
          {visit ? <Badge tone="info">{t.tickets.visit.badge}</Badge> : null}
        </span>
        <span>{formatRelativeId(item.createdAt, locale)}</span>
      </div>
      {visit && item.visit ? (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{item.visit.notes}</p>
          {item.visit.before || item.visit.after ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {item.visit.before ? <ActivityFile file={item.visit.before} label={t.tickets.visit.before} /> : null}
              {item.visit.after ? <ActivityFile file={item.visit.after} label={t.tickets.visit.after} /> : null}
            </div>
          ) : null}
        </div>
      ) : attachment && item.attachment ? (
        <ActivityFile file={item.attachment} />
      ) : (
        <CommentHtml html={item.comment} />
      )}
    </div>
  );
}
