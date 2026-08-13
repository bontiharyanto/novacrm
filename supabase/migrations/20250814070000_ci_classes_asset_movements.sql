-- Custom CI class cards + asset movement history (move / transfer / replace).

create table if not exists public.ci_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  group_key text not null check (group_key in ('offering', 'infra', 'edge', 'custom')),
  slug text not null,
  label text not null,
  hint text not null default '',
  sort_order integer not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create index if not exists idx_ci_classes_tenant
  on public.ci_classes (tenant_id, group_key, sort_order);

drop trigger if exists ci_classes_updated_at on public.ci_classes;
create trigger ci_classes_updated_at
before update on public.ci_classes
for each row execute function public.set_updated_at();

insert into public.ci_classes (id, tenant_id, group_key, slug, label, hint, sort_order, is_system, created_by)
values
  ('dddddddd-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'offering', 'business_service', 'Business service', 'What users consume', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'offering', 'application', 'Application', 'Software product', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'offering', 'service', 'Tech service', 'Runtime app or worker', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'infra', 'server', 'Server', 'Host or VM', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'infra', 'database', 'Database', 'Data store', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'infra', 'storage', 'Storage', 'SAN, NAS, bucket', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'infra', 'network', 'Network', 'Switch, firewall, link', 40, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'infra', 'load_balancer', 'Load balancer', 'Traffic entry', 50, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'infra', 'cluster', 'Cluster', 'HA or Kubernetes', 60, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000a', '11111111-1111-1111-1111-111111111111', 'infra', 'cloud', 'Cloud', 'VPC, instance, PaaS', 70, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000b', '11111111-1111-1111-1111-111111111111', 'edge', 'endpoint', 'Endpoint', 'Laptop or device', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000c', '11111111-1111-1111-1111-111111111111', 'edge', 'printer', 'Printer', 'Print queue', 20, true, '22222222-2222-2222-2222-222222222222')
on conflict (tenant_id, slug) do nothing;

alter table public.assets
  add column if not exists replaced_by_id uuid references public.assets(id) on delete set null;

create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  event_type text not null check (event_type in ('move', 'transfer', 'replace', 'status')),
  from_location text,
  to_location text,
  from_assignee text,
  to_assignee text,
  from_status text,
  to_status text,
  related_asset_id uuid references public.assets(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_asset_movements_asset
  on public.asset_movements (asset_id, created_at desc);

create or replace function public.log_asset_movement()
returns trigger
language plpgsql
as $$
declare
  kind text;
begin
  if old.location is not distinct from new.location
    and old.assigned_to is not distinct from new.assigned_to
    and old.status is not distinct from new.status
    and coalesce(old.replaced_by_id, '00000000-0000-0000-0000-000000000000'::uuid)
      is not distinct from coalesce(new.replaced_by_id, '00000000-0000-0000-0000-000000000000'::uuid)
  then
    return new;
  end if;

  if new.replaced_by_id is distinct from old.replaced_by_id and new.replaced_by_id is not null then
    kind := 'replace';
  elsif old.assigned_to is distinct from new.assigned_to then
    kind := 'transfer';
  elsif old.location is distinct from new.location then
    kind := 'move';
  else
    kind := 'status';
  end if;

  insert into public.asset_movements (
    tenant_id, account_id, asset_id, event_type,
    from_location, to_location, from_assignee, to_assignee,
    from_status, to_status, related_asset_id, created_by
  ) values (
    new.tenant_id, new.account_id, new.id, kind,
    old.location, new.location, old.assigned_to, new.assigned_to,
    old.status::text, new.status::text, new.replaced_by_id, auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists assets_log_movement on public.assets;
create trigger assets_log_movement
after update of location, assigned_to, status, replaced_by_id on public.assets
for each row execute function public.log_asset_movement();

alter table public.ci_classes enable row level security;
alter table public.asset_movements enable row level security;

drop policy if exists ci_classes_select on public.ci_classes;
create policy ci_classes_select on public.ci_classes
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists ci_classes_write on public.ci_classes;
create policy ci_classes_write on public.ci_classes
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists asset_movements_select on public.asset_movements;
create policy asset_movements_select on public.asset_movements
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists asset_movements_write on public.asset_movements;
create policy asset_movements_write on public.asset_movements
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.ci_classes to anon, authenticated, service_role;
grant select, insert, update, delete on public.asset_movements to anon, authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.ci_classes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.asset_movements;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

-- Demo history: Bank laptop finance moved then transferred
insert into public.asset_movements (
  id, tenant_id, account_id, asset_id, event_type,
  from_location, to_location, from_assignee, to_assignee,
  from_status, to_status, note, created_at, created_by
)
values
  (
    'eeeeeeee-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'move',
    'Jakarta HQ', 'Lt. 3',
    'Finance', 'Finance',
    'active', 'active',
    'Relokasi ke lantai marketing',
    now() - interval '18 days',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'transfer',
    'Lt. 3', 'Lt. 3',
    'Finance', 'Operations',
    'active', 'active',
    'Mutasi pemakai setelah reorg',
    now() - interval '6 days',
    '33333333-3333-3333-3333-333333333333'
  )
on conflict (id) do nothing;

alter table public.assets disable trigger assets_log_movement;
update public.assets
set location = 'Lt. 3', assigned_to = 'Operations'
where id = 'aaaaaaaa-0001-0001-0001-000000000001';
alter table public.assets enable trigger assets_log_movement;
