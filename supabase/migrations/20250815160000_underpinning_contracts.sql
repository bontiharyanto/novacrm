-- Formal Underpinning Contract (UC): vendor/principal targets beyond flat group OLA minutes.

create table if not exists public.underpinning_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  contract_number text not null,
  party_kind public.group_party_kind not null,
  party_name text not null,
  calendar_id uuid references public.sla_calendars(id) on delete set null,
  coverage text not null default '24x7' check (coverage in ('24x7', 'business_hours')),
  starts_on date,
  ends_on date,
  contact_email text,
  contact_phone text,
  service_scope text,
  penalty_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, contract_number),
  constraint underpinning_contracts_party_chk check (party_kind in ('vendor', 'principal')),
  constraint underpinning_contracts_dates_chk check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists idx_uc_tenant_active
  on public.underpinning_contracts (tenant_id, is_active, party_kind);

create table if not exists public.uc_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.underpinning_contracts(id) on delete cascade,
  ticket_type public.ticket_type not null,
  priority public.ticket_priority not null,
  response_minutes integer not null check (response_minutes > 0),
  resolve_minutes integer not null check (resolve_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (contract_id, ticket_type, priority)
);

create index if not exists idx_uc_targets_contract on public.uc_targets (contract_id);

alter table public.assignment_groups
  add column if not exists uc_id uuid references public.underpinning_contracts(id) on delete set null;

alter table public.tickets
  add column if not exists uc_id uuid references public.underpinning_contracts(id) on delete set null;

create index if not exists idx_tickets_uc on public.tickets (uc_id) where uc_id is not null;
create index if not exists idx_groups_uc on public.assignment_groups (uc_id) where uc_id is not null;

drop trigger if exists underpinning_contracts_updated_at on public.underpinning_contracts;
create trigger underpinning_contracts_updated_at
before update on public.underpinning_contracts
for each row execute function public.set_updated_at();

drop trigger if exists uc_targets_updated_at on public.uc_targets;
create trigger uc_targets_updated_at
before update on public.uc_targets
for each row execute function public.set_updated_at();

alter table public.underpinning_contracts enable row level security;
alter table public.uc_targets enable row level security;

drop policy if exists underpinning_contracts_select on public.underpinning_contracts;
create policy underpinning_contracts_select on public.underpinning_contracts
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists underpinning_contracts_write on public.underpinning_contracts;
create policy underpinning_contracts_write on public.underpinning_contracts
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

drop policy if exists uc_targets_select on public.uc_targets;
create policy uc_targets_select on public.uc_targets
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists uc_targets_write on public.uc_targets;
create policy uc_targets_write on public.uc_targets
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

grant select, insert, update, delete on public.underpinning_contracts to anon, authenticated, service_role;
grant select, insert, update, delete on public.uc_targets to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.underpinning_contracts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.uc_targets;
  exception when duplicate_object then null;
  end;
end $$;

insert into public.underpinning_contracts (
  id, tenant_id, name, contract_number, party_kind, party_name,
  calendar_id, coverage, starts_on, ends_on, contact_email, service_scope, penalty_notes, is_active, created_by
)
values
  (
    'b2b2b2b2-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Fortinet TAC Gold',
    'UC-FTNT-2026',
    'vendor',
    'Fortinet',
    'c1c1c1c1-0001-0001-0001-000000000001',
    '24x7',
    '2026-01-01',
    '2026-12-31',
    'tac@fortinet.example',
    'Firewall / SD-WAN hardware and firmware TAC.',
    'Missed P1 response: service credit 2% of monthly fee.',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'b2b2b2b2-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Indosat Circuit Principal',
    'UC-ISAT-2026',
    'principal',
    'Indosat',
    'c1c1c1c1-0001-0001-0001-000000000001',
    '24x7',
    '2026-01-01',
    '2026-12-31',
    'noc@indosat.example',
    'Last-mile and backbone circuits for Bank + Internal.',
    'Availability below 99.5% in a month: 1-day credit.',
    true,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do update
set
  name = excluded.name,
  party_kind = excluded.party_kind,
  party_name = excluded.party_name,
  coverage = excluded.coverage,
  is_active = excluded.is_active;

insert into public.uc_targets (
  tenant_id, contract_id, ticket_type, priority, response_minutes, resolve_minutes, created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  t.contract_id,
  t.ticket_type::public.ticket_type,
  t.priority::public.ticket_priority,
  t.response_minutes,
  t.resolve_minutes,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    -- Fortinet vendor: high incident matches prior group 4h/24h
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'incident', 'critical', 60, 480),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'incident', 'high', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'incident', 'medium', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'incident', 'low', 960, 5760),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'problem', 'critical', 120, 960),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'problem', 'high', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'problem', 'medium', 960, 5760),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'problem', 'low', 1440, 8640),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'change', 'critical', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'change', 'high', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'change', 'medium', 960, 5760),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'change', 'low', 1440, 8640),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'request', 'critical', 120, 960),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'request', 'high', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'request', 'medium', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000001'::uuid, 'request', 'low', 960, 5760),
    -- Indosat principal: high incident matches prior group 2h/8h
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'incident', 'critical', 30, 240),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'incident', 'high', 120, 480),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'incident', 'medium', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'incident', 'low', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'problem', 'critical', 60, 480),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'problem', 'high', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'problem', 'medium', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'problem', 'low', 960, 5760),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'change', 'critical', 120, 960),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'change', 'high', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'change', 'medium', 480, 2880),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'change', 'low', 960, 5760),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'request', 'critical', 60, 480),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'request', 'high', 120, 960),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'request', 'medium', 240, 1440),
    ('b2b2b2b2-0001-0001-0001-000000000002'::uuid, 'request', 'low', 480, 2880)
) as t(contract_id, ticket_type, priority, response_minutes, resolve_minutes)
on conflict (contract_id, ticket_type, priority) do update
set
  response_minutes = excluded.response_minutes,
  resolve_minutes = excluded.resolve_minutes;

update public.assignment_groups
set uc_id = 'b2b2b2b2-0001-0001-0001-000000000001'
where id = '99999999-0001-0001-0001-000000000007'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

update public.assignment_groups
set uc_id = 'b2b2b2b2-0001-0001-0001-000000000002'
where id = '99999999-0001-0001-0001-000000000008'
  and tenant_id = '11111111-1111-1111-1111-111111111111';
