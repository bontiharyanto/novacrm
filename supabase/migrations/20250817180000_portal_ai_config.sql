-- Portal Ask AI must resolve the tenant AI key without an admin session.
-- integrations RLS is admin-only, so customers cannot select the row directly.
-- SECURITY DEFINER reads the caller's tenant only (current_tenant_id).

create or replace function public.tenant_ai_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select i.config
    into cfg
  from public.integrations i
  where i.tenant_id = public.current_tenant_id()
    and i.kind = 'ai'
  limit 1;

  return cfg;
end;
$$;

revoke all on function public.tenant_ai_config() from public;
grant execute on function public.tenant_ai_config() to authenticated, service_role;

drop policy if exists integrations_admin on public.integrations;
create policy integrations_admin on public.integrations
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
);
