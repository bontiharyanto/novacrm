-- Service Catalog: categories, variable sets, catalog items, record producer fields on tickets

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create table if not exists public.catalog_variable_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  description text,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category_id uuid references public.catalog_categories(id) on delete set null,
  variable_set_id uuid references public.catalog_variable_sets(id) on delete set null,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  icon text not null default 'clipboard',
  ticket_type text not null default 'request'
    check (ticket_type in ('incident', 'problem', 'change', 'request')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create index if not exists idx_catalog_items_tenant_active
  on public.catalog_items (tenant_id, is_active, category_id);

alter table public.tickets
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;

alter table public.tickets
  add column if not exists catalog_answers jsonb not null default '{}'::jsonb;

drop trigger if exists catalog_categories_updated_at on public.catalog_categories;
create trigger catalog_categories_updated_at
before update on public.catalog_categories
for each row execute function public.set_updated_at();

drop trigger if exists catalog_variable_sets_updated_at on public.catalog_variable_sets;
create trigger catalog_variable_sets_updated_at
before update on public.catalog_variable_sets
for each row execute function public.set_updated_at();

drop trigger if exists catalog_items_updated_at on public.catalog_items;
create trigger catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

alter table public.catalog_categories enable row level security;
alter table public.catalog_variable_sets enable row level security;
alter table public.catalog_items enable row level security;

drop policy if exists catalog_categories_staff on public.catalog_categories;
create policy catalog_categories_staff on public.catalog_categories
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists catalog_categories_read_portal on public.catalog_categories;
create policy catalog_categories_read_portal on public.catalog_categories
for select using (
  tenant_id = public.current_tenant_id()
  and is_active = true
);

drop policy if exists catalog_variable_sets_staff on public.catalog_variable_sets;
create policy catalog_variable_sets_staff on public.catalog_variable_sets
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists catalog_variable_sets_read_portal on public.catalog_variable_sets;
create policy catalog_variable_sets_read_portal on public.catalog_variable_sets
for select using (tenant_id = public.current_tenant_id());

drop policy if exists catalog_items_staff on public.catalog_items;
create policy catalog_items_staff on public.catalog_items
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists catalog_items_read_portal on public.catalog_items;
create policy catalog_items_read_portal on public.catalog_items
for select using (
  tenant_id = public.current_tenant_id()
  and is_active = true
);

grant select, insert, update, delete on public.catalog_categories to anon, authenticated, service_role;
grant select, insert, update, delete on public.catalog_variable_sets to anon, authenticated, service_role;
grant select, insert, update, delete on public.catalog_items to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.catalog_items;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.catalog_variable_sets;
  exception when duplicate_object then
    null;
  end;
end $$;
