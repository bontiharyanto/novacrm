-- Ticket fulfillment / investigation / change tasks (child work items).
-- Catalog items may define fulfillment_steps + sequential pipeline.

alter table public.catalog_items
  add column if not exists fulfillment_steps jsonb not null default '[]'::jsonb;

alter table public.catalog_items
  add column if not exists fulfillment_sequential boolean not null default true;

comment on column public.catalog_items.fulfillment_steps is
  'Ordered task templates: [{title, taskType, sortOrder}]. Used when creating tickets from this item.';
comment on column public.catalog_items.fulfillment_sequential is
  'When true, generated ticket tasks must complete in sort_order.';

alter table public.tickets
  add column if not exists task_sequential boolean not null default false;

comment on column public.tickets.task_sequential is
  'When true, ticket_tasks must start/complete in sort_order (earlier must be done/cancelled).';

create table if not exists public.ticket_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  number text not null,
  title text not null,
  task_type text not null default 'other',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'cancelled')),
  group_id uuid references public.assignment_groups (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  sort_order int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (tenant_id, number)
);

create index if not exists idx_ticket_tasks_ticket
  on public.ticket_tasks (tenant_id, ticket_id, sort_order);

create index if not exists idx_ticket_tasks_assignee
  on public.ticket_tasks (tenant_id, assignee_id)
  where status in ('open', 'in_progress');

create or replace function public.next_task_number(p_tenant uuid)
returns text
language plpgsql
as $$
declare
  n int;
begin
  select coalesce(max(nullif(regexp_replace(number, '\D', '', 'g'), '')::int), 0) + 1
    into n
  from public.ticket_tasks
  where tenant_id = p_tenant;
  return 'TASK' || lpad(n::text, 7, '0');
end;
$$;

create or replace function public.ticket_tasks_set_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null or btrim(new.number) = '' then
    new.number := public.next_task_number(new.tenant_id);
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_tasks_set_number on public.ticket_tasks;
create trigger ticket_tasks_set_number
before insert on public.ticket_tasks
for each row execute function public.ticket_tasks_set_number();

drop trigger if exists ticket_tasks_updated_at on public.ticket_tasks;
create trigger ticket_tasks_updated_at
before update on public.ticket_tasks
for each row execute function public.set_updated_at();

alter table public.ticket_tasks enable row level security;

drop policy if exists ticket_tasks_select on public.ticket_tasks;
create policy ticket_tasks_select on public.ticket_tasks
for select using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and t.tenant_id = ticket_tasks.tenant_id
  )
);

drop policy if exists ticket_tasks_insert on public.ticket_tasks;
create policy ticket_tasks_insert on public.ticket_tasks
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent', 'manager', 'supervisor', 'team_lead', 'superadmin')
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_id and t.tenant_id = ticket_tasks.tenant_id
  )
);

drop policy if exists ticket_tasks_update on public.ticket_tasks;
create policy ticket_tasks_update on public.ticket_tasks
for update using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent', 'manager', 'supervisor', 'team_lead', 'superadmin')
) with check (
  tenant_id = public.current_tenant_id()
);

drop policy if exists ticket_tasks_delete on public.ticket_tasks;
create policy ticket_tasks_delete on public.ticket_tasks
for delete using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'manager', 'supervisor', 'superadmin')
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.ticket_tasks;
  exception when duplicate_object then null;
  end;
end $$;
