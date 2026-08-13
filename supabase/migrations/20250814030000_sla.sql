-- SLA calendars + per-account agreements. Ticket clocks are snapshotted at create.

create table if not exists public.sla_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete restrict,
  name text not null,
  timezone text not null default 'Asia/Jakarta',
  is_24x7 boolean not null default false,
  business_hours jsonb not null default '{}'::jsonb,
  holidays jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, name)
);

create index if not exists idx_sla_calendars_tenant on public.sla_calendars (tenant_id, account_id);

create table if not exists public.sla_agreements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  calendar_id uuid not null references public.sla_calendars(id) on delete restrict,
  name text not null,
  pause_on_waiting boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists sla_agreements_one_active
  on public.sla_agreements (account_id)
  where is_active;

create index if not exists idx_sla_agreements_account
  on public.sla_agreements (tenant_id, account_id, is_active);

create table if not exists public.sla_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  agreement_id uuid not null references public.sla_agreements(id) on delete cascade,
  ticket_type public.ticket_type not null,
  priority public.ticket_priority not null,
  response_minutes integer not null check (response_minutes > 0),
  resolve_minutes integer not null check (resolve_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (agreement_id, ticket_type, priority)
);

create index if not exists idx_sla_targets_agreement on public.sla_targets (agreement_id);

alter table public.tickets
  add column if not exists sla_agreement_id uuid references public.sla_agreements(id) on delete set null,
  add column if not exists sla_response_minutes integer,
  add column if not exists sla_resolve_minutes integer,
  add column if not exists sla_response_at timestamptz,
  add column if not exists sla_resolve_by timestamptz,
  add column if not exists sla_responded_at timestamptz,
  add column if not exists sla_paused_at timestamptz;

create index if not exists idx_tickets_sla_agreement on public.tickets (sla_agreement_id)
  where sla_agreement_id is not null;

drop trigger if exists sla_calendars_updated_at on public.sla_calendars;
create trigger sla_calendars_updated_at
before update on public.sla_calendars
for each row execute function public.set_updated_at();

drop trigger if exists sla_agreements_updated_at on public.sla_agreements;
create trigger sla_agreements_updated_at
before update on public.sla_agreements
for each row execute function public.set_updated_at();

drop trigger if exists sla_targets_updated_at on public.sla_targets;
create trigger sla_targets_updated_at
before update on public.sla_targets
for each row execute function public.set_updated_at();

create or replace function public.enforce_ticket_sla_account()
returns trigger
language plpgsql
as $$
declare
  agreement_account uuid;
begin
  if new.sla_agreement_id is null then
    return new;
  end if;

  select account_id into agreement_account
  from public.sla_agreements
  where id = new.sla_agreement_id;

  if agreement_account is distinct from new.account_id then
    raise exception 'SLA agreement must belong to the ticket account';
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_sla_account on public.tickets;
create trigger tickets_sla_account
before insert or update of sla_agreement_id, account_id on public.tickets
for each row execute function public.enforce_ticket_sla_account();

insert into public.sla_calendars (
  id, tenant_id, account_id, name, timezone, is_24x7, business_hours, holidays, created_by
)
values
  (
    'c1c1c1c1-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    null,
    'Nova office hours',
    'Asia/Jakarta',
    false,
    '{"mon":[["08:00","17:00"]],"tue":[["08:00","17:00"]],"wed":[["08:00","17:00"]],"thu":[["08:00","17:00"]],"fri":[["08:00","17:00"]],"sat":[],"sun":[]}'::jsonb,
    '[{"date":"2026-01-01","name":"Tahun Baru"},{"date":"2026-08-17","name":"Hari Kemerdekaan"},{"date":"2026-12-25","name":"Natal"}]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'c1c1c1c1-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'Bank Gold hours',
    'Asia/Jakarta',
    false,
    '{"mon":[["07:00","21:00"]],"tue":[["07:00","21:00"]],"wed":[["07:00","21:00"]],"thu":[["07:00","21:00"]],"fri":[["07:00","21:00"]],"sat":[["08:00","13:00"]],"sun":[]}'::jsonb,
    '[{"date":"2026-01-01","name":"Tahun Baru"},{"date":"2026-08-17","name":"Hari Kemerdekaan"},{"date":"2026-12-24","name":"Malam Natal"},{"date":"2026-12-25","name":"Natal"}]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.sla_agreements (
  id, tenant_id, account_id, calendar_id, name, pause_on_waiting, is_active, created_by
)
values
  (
    'a9a9a9a9-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'c1c1c1c1-0001-0001-0001-000000000001',
    'Internal office',
    true,
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'a9a9a9a9-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'c1c1c1c1-0001-0001-0001-000000000002',
    'Bank Gold',
    true,
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'a9a9a9a9-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000003',
    'c1c1c1c1-0001-0001-0001-000000000001',
    'Garuda Standard',
    true,
    true,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.sla_targets (
  tenant_id, agreement_id, ticket_type, priority, response_minutes, resolve_minutes, created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  t.agreement_id,
  t.ticket_type::public.ticket_type,
  t.priority::public.ticket_priority,
  t.response_minutes,
  t.resolve_minutes,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'critical', 30, 240),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'high', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'medium', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'low', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'low', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'critical', 120, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'low', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'low', 480, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'critical', 15, 240),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'high', 30, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'medium', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'low', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'critical', 30, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'high', 60, 960),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'low', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'high', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'low', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'critical', 30, 240),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'high', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'medium', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'low', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'low', 480, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'critical', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'medium', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'low', 960, 8640),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'critical', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'high', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'medium', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'low', 1440, 8640),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'critical', 120, 480),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'low', 960, 5760)
) as t(agreement_id, ticket_type, priority, response_minutes, resolve_minutes)
on conflict (agreement_id, ticket_type, priority) do nothing;

update public.tickets t
set
  sla_agreement_id = a.id,
  sla_response_minutes = tgt.response_minutes,
  sla_resolve_minutes = tgt.resolve_minutes,
  sla_resolve_by = coalesce(t.due_date, t.created_at + (tgt.resolve_minutes || ' minutes')::interval),
  sla_response_at = t.created_at + (tgt.response_minutes || ' minutes')::interval,
  sla_responded_at = case when t.assignee_id is not null then t.created_at else null end,
  sla_paused_at = case when t.status in ('waiting', 'hold') then now() else null end,
  due_date = coalesce(t.due_date, t.created_at + (tgt.resolve_minutes || ' minutes')::interval)
from public.sla_agreements a
join public.sla_targets tgt
  on tgt.agreement_id = a.id
where a.account_id = t.account_id
  and tgt.ticket_type = t.type
  and tgt.priority = t.priority
  and a.is_active
  and t.sla_agreement_id is null;

alter table public.sla_calendars enable row level security;
alter table public.sla_agreements enable row level security;
alter table public.sla_targets enable row level security;

drop policy if exists sla_calendars_select on public.sla_calendars;
create policy sla_calendars_select on public.sla_calendars
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and (account_id is null or account_id = any (public.accessible_account_ids()))
);

drop policy if exists sla_calendars_write on public.sla_calendars;
create policy sla_calendars_write on public.sla_calendars
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
  and (account_id is null or account_id = any (public.accessible_account_ids()))
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
  and (account_id is null or account_id = any (public.accessible_account_ids()))
);

drop policy if exists sla_agreements_select on public.sla_agreements;
create policy sla_agreements_select on public.sla_agreements
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists sla_agreements_write on public.sla_agreements;
create policy sla_agreements_write on public.sla_agreements
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
);

drop policy if exists sla_targets_select on public.sla_targets;
create policy sla_targets_select on public.sla_targets
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and exists (
    select 1 from public.sla_agreements a
    where a.id = agreement_id
      and a.account_id = any (public.accessible_account_ids())
  )
);

drop policy if exists sla_targets_write on public.sla_targets;
create policy sla_targets_write on public.sla_targets
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

grant select, insert, update, delete on public.sla_calendars to anon, authenticated, service_role;
grant select, insert, update, delete on public.sla_agreements to anon, authenticated, service_role;
grant select, insert, update, delete on public.sla_targets to anon, authenticated, service_role;
grant execute on function public.enforce_ticket_sla_account() to anon, authenticated, service_role;
