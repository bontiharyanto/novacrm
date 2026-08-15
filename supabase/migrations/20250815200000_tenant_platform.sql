-- Superadmin can list, create, and update any tenant. Staff still see only their own row.

drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
for select using (
  id = public.current_tenant_id()
  or public.is_superadmin()
);

drop policy if exists tenants_insert_superadmin on public.tenants;
create policy tenants_insert_superadmin on public.tenants
for insert with check (public.is_superadmin());

drop policy if exists tenants_update_admin on public.tenants;
create policy tenants_update_admin on public.tenants
for update using (
  (
    id = public.current_tenant_id()
    and public.current_app_role() in ('admin', 'superadmin')
  )
  or public.is_superadmin()
)
with check (
  (
    id = public.current_tenant_id()
    and public.current_app_role() in ('admin', 'superadmin')
  )
  or public.is_superadmin()
);
