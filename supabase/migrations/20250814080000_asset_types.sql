-- User-defined asset types (laptop, server, … plus custom like CCTV).

create table if not exists public.asset_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  slug text not null,
  label text not null,
  sort_order integer not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create index if not exists idx_asset_types_tenant
  on public.asset_types (tenant_id, sort_order);

drop trigger if exists asset_types_updated_at on public.asset_types;
create trigger asset_types_updated_at
before update on public.asset_types
for each row execute function public.set_updated_at();

alter table public.assets
  alter column type type text using type::text;

do $$
begin
  drop type if exists public.asset_type;
exception when dependent_objects_still_exist then
  null;
end $$;

insert into public.asset_types (id, tenant_id, slug, label, sort_order, is_system, created_by)
values
  ('ffffffff-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'laptop', 'Laptop', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'server', 'Server', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'network', 'Network', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'printer', 'Printer', 40, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'mobile', 'Mobile', 50, true, '22222222-2222-2222-2222-222222222222')
on conflict (tenant_id, slug) do nothing;

alter table public.asset_types enable row level security;

drop policy if exists asset_types_select on public.asset_types;
create policy asset_types_select on public.asset_types
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists asset_types_write on public.asset_types;
create policy asset_types_write on public.asset_types
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.asset_types to anon, authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.asset_types;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
