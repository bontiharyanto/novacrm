create type public.ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  description text default '',
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  assignee_id uuid,
  requester_id uuid,
  asset_id uuid,
  category text,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tickets_tenant_status on public.tickets (tenant_id, status);
create index if not exists idx_tickets_tenant_due on public.tickets (tenant_id, due_date);
create index if not exists idx_ticket_comments_ticket_id on public.ticket_comments (ticket_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();

create trigger ticket_comments_updated_at
before update on public.ticket_comments
for each row
execute function public.set_updated_at();

alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

create policy "tickets_tenant_isolation"
on public.tickets
for all
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "ticket_comments_tenant_isolation"
on public.ticket_comments
for all
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

comment on table public.tickets is 'Core support and service tickets.';
comment on table public.ticket_comments is 'Comments and updates for a ticket.';
