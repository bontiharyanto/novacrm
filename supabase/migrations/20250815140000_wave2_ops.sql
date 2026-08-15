-- Wave 2: ticket audit trail, OLA clocks per assignment group.

create table if not exists public.ticket_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid,
  actor_name text,
  action text not null,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_ticket_audit_ticket
  on public.ticket_audit_events (tenant_id, ticket_id, created_at desc);

alter table public.ticket_audit_events enable row level security;

drop policy if exists ticket_audit_events_select on public.ticket_audit_events;
create policy ticket_audit_events_select on public.ticket_audit_events
for select using (
  tenant_id = public.current_tenant_id() and public.is_staff()
);

drop policy if exists ticket_audit_events_write on public.ticket_audit_events;
create policy ticket_audit_events_write on public.ticket_audit_events
for insert with check (
  tenant_id = public.current_tenant_id() and public.is_staff()
);

grant select, insert on public.ticket_audit_events to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.ticket_audit_events;
  exception when duplicate_object then
    null;
  end;
end $$;

alter table public.assignment_groups
  add column if not exists ola_response_minutes integer not null default 45,
  add column if not exists ola_resolve_minutes integer not null default 360;

alter table public.tickets
  add column if not exists ola_response_minutes integer,
  add column if not exists ola_resolve_minutes integer,
  add column if not exists ola_response_at timestamptz,
  add column if not exists ola_resolve_by timestamptz,
  add column if not exists ola_started_at timestamptz;

update public.assignment_groups
set
  ola_response_minutes = case tier
    when 'l1' then 30
    when 'l2' then 60
    when 'l3' then 120
    else ola_response_minutes
  end,
  ola_resolve_minutes = case tier
    when 'l1' then 240
    when 'l2' then 480
    when 'l3' then 960
    else ola_resolve_minutes
  end
where tier is not null;

update public.tickets t
set
  ola_response_minutes = g.ola_response_minutes,
  ola_resolve_minutes = g.ola_resolve_minutes,
  ola_started_at = coalesce(t.ola_started_at, t.created_at),
  ola_response_at = coalesce(t.ola_response_at, t.created_at + make_interval(mins => g.ola_response_minutes)),
  ola_resolve_by = coalesce(t.ola_resolve_by, t.created_at + make_interval(mins => g.ola_resolve_minutes))
from public.assignment_groups g
where t.group_id = g.id
  and t.ola_resolve_by is null;
