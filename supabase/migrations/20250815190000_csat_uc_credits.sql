-- CSAT after resolve + UC service credits when vendor/principal OLA clocks breach.

create table if not exists public.ticket_csat (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (ticket_id)
);

create index if not exists idx_ticket_csat_tenant
  on public.ticket_csat (tenant_id, created_at desc);

create table if not exists public.uc_credits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.underpinning_contracts(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  group_id uuid references public.assignment_groups(id) on delete set null,
  reason text not null default 'ola_resolve_breach',
  credit_minutes integer not null check (credit_minutes > 0),
  amount_note text,
  status text not null default 'open' check (status in ('open', 'applied', 'waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (ticket_id)
);

create index if not exists idx_uc_credits_contract
  on public.uc_credits (tenant_id, contract_id, created_at desc);

drop trigger if exists ticket_csat_updated_at on public.ticket_csat;
create trigger ticket_csat_updated_at
before update on public.ticket_csat
for each row execute function public.set_updated_at();

drop trigger if exists uc_credits_updated_at on public.uc_credits;
create trigger uc_credits_updated_at
before update on public.uc_credits
for each row execute function public.set_updated_at();

alter table public.ticket_csat enable row level security;
alter table public.uc_credits enable row level security;

drop policy if exists ticket_csat_select on public.ticket_csat;
create policy ticket_csat_select on public.ticket_csat
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_staff()
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.requester_id = auth.uid()
    )
  )
);

drop policy if exists ticket_csat_write on public.ticket_csat;
create policy ticket_csat_write on public.ticket_csat
for insert with check (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_id
      and t.requester_id = auth.uid()
      and t.status in ('resolved', 'closed')
  )
);

drop policy if exists uc_credits_select on public.uc_credits;
create policy uc_credits_select on public.uc_credits
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists uc_credits_write on public.uc_credits;
create policy uc_credits_write on public.uc_credits
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert on public.ticket_csat to anon, authenticated, service_role;
grant select, insert on public.uc_credits to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.ticket_csat;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.uc_credits;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Lab: score resolved Bank tickets; Fortinet + Indosat clocks already late.
update public.tickets
set
  group_id = '99999999-0001-0001-0001-000000000007',
  uc_id = 'b2b2b2b2-0001-0001-0001-000000000001',
  ola_started_at = now() - interval '36 hours',
  ola_resolve_by = now() - interval '6 hours',
  sla_paused_at = null
where title = 'Phishing email masuk'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

update public.tickets
set
  group_id = '99999999-0001-0001-0001-000000000008',
  uc_id = 'b2b2b2b2-0001-0001-0001-000000000002',
  ola_started_at = now() - interval '20 hours',
  ola_resolve_by = now() - interval '4 hours',
  sla_paused_at = null
where title = 'AC ruang server panas'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000001',
  t.tenant_id,
  t.id,
  5,
  'Monitor replaced the same day.',
  t.requester_id
from public.tickets t
where t.title = 'Monitor bergaris'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000002',
  t.tenant_id,
  t.id,
  3,
  'Port fixed, but waited too long.',
  t.requester_id
from public.tickets t
where t.title = 'Kabel LAN putus'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000003',
  t.tenant_id,
  t.id,
  4,
  'Account ready before start date.',
  t.requester_id
from public.tickets t
where t.title = 'User baru butuh akun'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.uc_credits (
  id, tenant_id, contract_id, ticket_id, group_id, reason, credit_minutes, amount_note, status, created_by
)
select
  'd4d4d4d4-0001-0001-0001-000000000001',
  t.tenant_id,
  'b2b2b2b2-0001-0001-0001-000000000001',
  t.id,
  t.group_id,
  'ola_resolve_breach',
  360,
  'Missed P1 response: service credit 2% of monthly fee.',
  'open',
  '22222222-2222-2222-2222-222222222222'
from public.tickets t
where t.title = 'Phishing email masuk'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.uc_credits (
  id, tenant_id, contract_id, ticket_id, group_id, reason, credit_minutes, amount_note, status, created_by
)
select
  'd4d4d4d4-0001-0001-0001-000000000002',
  t.tenant_id,
  'b2b2b2b2-0001-0001-0001-000000000002',
  t.id,
  t.group_id,
  'ola_resolve_breach',
  120,
  'Availability below 99.5% in a month: 1-day credit.',
  'open',
  '22222222-2222-2222-2222-222222222222'
from public.tickets t
where t.title = 'AC ruang server panas'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

notify pgrst, 'reload schema';
