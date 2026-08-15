-- Tenant MFA toggle. Default off so lab passwords keep working. Flip on in production.

alter table public.tenants
  add column if not exists mfa_required boolean not null default false;

update public.tenants
set mfa_required = false
where slug = 'novacrm-demo';

drop policy if exists tenants_update_admin on public.tenants;
create policy tenants_update_admin on public.tenants
for update using (
  id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
) with check (
  id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
);
