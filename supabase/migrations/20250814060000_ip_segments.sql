-- IPAM-lite: CIDR segments belong to one account and optionally one network CI.

create table if not exists public.ip_segments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  cmdb_item_id uuid references public.cmdb_items(id) on delete set null,
  name text not null,
  cidr cidr not null,
  vlan integer check (vlan is null or (vlan between 1 and 4094)),
  gateway inet,
  purpose text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (account_id, cidr)
);

create index if not exists idx_ip_segments_account
  on public.ip_segments (tenant_id, account_id);
create index if not exists idx_ip_segments_ci
  on public.ip_segments (cmdb_item_id)
  where cmdb_item_id is not null;

drop trigger if exists ip_segments_updated_at on public.ip_segments;
create trigger ip_segments_updated_at
before update on public.ip_segments
for each row execute function public.set_updated_at();

create or replace function public.enforce_ip_segment_same_account()
returns trigger
language plpgsql
as $$
declare
  ci_account uuid;
begin
  if new.cmdb_item_id is null then
    return new;
  end if;
  select account_id into ci_account from public.cmdb_items where id = new.cmdb_item_id;
  if ci_account is null then
    raise exception 'IP segment CI not found';
  end if;
  if ci_account is distinct from new.account_id then
    raise exception 'IP segment must stay in the same account as the CI';
  end if;
  return new;
end;
$$;

drop trigger if exists ip_segments_same_account on public.ip_segments;
create trigger ip_segments_same_account
before insert or update of cmdb_item_id, account_id on public.ip_segments
for each row execute function public.enforce_ip_segment_same_account();

alter table public.ip_segments enable row level security;

drop policy if exists ip_segments_select on public.ip_segments;
create policy ip_segments_select on public.ip_segments
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists ip_segments_write on public.ip_segments;
create policy ip_segments_write on public.ip_segments
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.ip_segments to anon, authenticated, service_role;

notify pgrst, 'reload schema';

do $$
begin
  alter publication supabase_realtime add table public.ip_segments;
exception when duplicate_object then null;
end $$;

-- Bank Nusantara
insert into public.ip_segments (id, tenant_id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose, created_by)
values
  ('cccccccc-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000014', 'WAN inside', '10.20.254.0/30', 99, '10.20.254.1', 'wan', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000015', 'Mgmt HQ', '10.20.0.0/24', 10, '10.20.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000016', 'Users Lt.2', '10.20.2.0/24', 20, '10.20.2.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000017', 'Users Lt.3', '10.20.3.0/24', 30, '10.20.3.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000018', 'WiFi BN-Corp', '10.20.50.0/24', 50, '10.20.50.1', 'wifi', '22222222-2222-2222-2222-222222222222')
on conflict (account_id, cidr) do nothing;

-- Garuda
insert into public.ip_segments (id, tenant_id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose, created_by)
values
  ('cccccccc-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000020', 'Mgmt gudang', '10.30.0.0/24', 10, '10.30.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000021', 'LAN gudang', '10.30.10.0/24', 20, '10.30.10.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000022', 'WiFi GL-WH', '10.30.50.0/24', 50, '10.30.50.1', 'wifi', '22222222-2222-2222-2222-222222222222')
on conflict (account_id, cidr) do nothing;

-- Internal DC
insert into public.ip_segments (id, tenant_id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose, created_by)
values
  ('cccccccc-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000003', 'Mgmt DC-1', '10.0.0.0/24', 10, '10.0.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-00000000000a', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000003', 'Servers', '10.0.10.0/24', 20, '10.0.10.1', 'server', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-00000000000b', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000004', 'VPN pool', '10.0.20.0/24', 30, '10.0.20.1', 'vpn', '22222222-2222-2222-2222-222222222222')
on conflict (account_id, cidr) do nothing;

update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.3.20"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000008';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.3.41"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000009';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.50.18"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000010';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.30.10.20"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000011';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.30.50.88"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000012';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.0.10.11"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000001';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.0.10.12"}'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000002';
