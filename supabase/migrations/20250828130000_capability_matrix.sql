-- Tenant-scoped capability matrix.
-- Defaults remain defined in lib/rbac/ability.ts; rows here are explicit tenant overrides.

create table if not exists public.role_capabilities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null
    check (role in ('customer', 'agent', 'team_lead', 'supervisor', 'manager', 'admin', 'superadmin')),
  action text not null
    check (action in ('manage', 'create', 'read', 'update', 'delete')),
  subject text not null,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (tenant_id, role, action, subject)
);

create index if not exists idx_role_capabilities_lookup
  on public.role_capabilities (tenant_id, role, subject, action);

drop trigger if exists role_capabilities_updated_at on public.role_capabilities;
create trigger role_capabilities_updated_at
before update on public.role_capabilities
for each row execute function public.set_updated_at();

alter table public.role_capabilities enable row level security;

drop policy if exists role_capabilities_select on public.role_capabilities;
create policy role_capabilities_select on public.role_capabilities
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists role_capabilities_write on public.role_capabilities;
create policy role_capabilities_write on public.role_capabilities
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
);

grant select, insert, update, delete on public.role_capabilities to authenticated, service_role;

notify pgrst, 'reload schema';
