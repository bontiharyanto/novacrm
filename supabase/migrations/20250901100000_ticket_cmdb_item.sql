-- Link tickets to root CMDB CI for major-incident impact detection.

alter table public.tickets
  add column if not exists cmdb_item_id uuid references public.cmdb_items(id) on delete set null;

create index if not exists idx_tickets_cmdb_item
  on public.tickets (tenant_id, cmdb_item_id)
  where cmdb_item_id is not null;

comment on column public.tickets.cmdb_item_id is
  'Root configuration item for impact analysis (e.g. WAN circuit on a major incident parent).';
