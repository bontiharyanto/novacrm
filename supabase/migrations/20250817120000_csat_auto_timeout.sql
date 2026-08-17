-- Auto CSAT after 7 working days without a requester rating.

alter table public.ticket_csat
  add column if not exists source text not null default 'customer';

alter table public.ticket_csat
  drop constraint if exists ticket_csat_source_check;

alter table public.ticket_csat
  add constraint ticket_csat_source_check
  check (source in ('customer', 'auto_timeout'));

comment on column public.ticket_csat.source is
  'customer = requester submitted; auto_timeout = 5/5 after 7 working days with no response';
