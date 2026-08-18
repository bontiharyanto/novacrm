-- Structured ticket activity: attachments and field visit reports stay on the comment timeline.

alter table public.ticket_comments
  add column if not exists kind text not null default 'comment',
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.ticket_comments
  drop constraint if exists ticket_comments_kind_check;

alter table public.ticket_comments
  add constraint ticket_comments_kind_check
  check (kind in ('comment', 'attachment', 'visit'));

create index if not exists idx_ticket_comments_kind
  on public.ticket_comments (tenant_id, ticket_id, kind);

comment on column public.ticket_comments.kind is 'comment | attachment | visit';
comment on column public.ticket_comments.meta is 'Attachment or visit payload (storage keys, notes).';

notify pgrst, 'reload schema';
