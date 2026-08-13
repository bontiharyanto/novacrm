-- Privileges for PostgREST roles. Tables were created without SELECT/INSERT/UPDATE/DELETE
-- for anon, authenticated, and service_role, so login bounced after Auth succeeded.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or tenant_id = public.current_tenant_id()
);
