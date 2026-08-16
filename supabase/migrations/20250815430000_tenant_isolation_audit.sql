-- Superadmin isolation audit. Service role only — never expose to tenant sessions.

create or replace function public.audit_tenant_isolation()
returns table (
  severity text,
  check_id text,
  object_name text,
  detail text,
  row_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  rel record;
  policy_sql text;
  isolated boolean;
  orphan_n bigint;
  mismatch_n bigint;
begin
  for rel in
    select c.relname as table_name, c.relrowsecurity as rls_on,
      exists (
        select 1 from information_schema.columns col
        where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'tenant_id'
      ) as has_tenant
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  loop
    if rel.table_name in ('schema_migrations', 'tenants') then
      severity := 'pass';
      check_id := 'allowlist';
      object_name := rel.table_name;
      detail := 'Platform table — tenant_id not required.';
      row_count := 0;
      return next;
      continue;
    end if;

    if not rel.has_tenant then
      severity := 'fail';
      check_id := 'missing_tenant_id';
      object_name := rel.table_name;
      detail := 'Business table has no tenant_id column.';
      row_count := 0;
      return next;
      continue;
    end if;

    if not rel.rls_on then
      severity := 'fail';
      check_id := 'rls_disabled';
      object_name := rel.table_name;
      detail := 'RLS is off. Any authenticated query can read every tenant.';
      row_count := 0;
      return next;
    else
      select coalesce(string_agg(coalesce(pg_get_expr(p.polqual, p.polrelid), '') || ' ' || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''), ' '), '')
        into policy_sql
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      where c.relname = rel.table_name;

      isolated := policy_sql ilike '%current_tenant_id%'
        or policy_sql ilike '%tenant_id%'
        or policy_sql ilike '%accessible_account_ids%';

      if policy_sql is null or btrim(policy_sql) = '' then
        severity := 'pass';
        check_id := 'rls_deny';
        object_name := rel.table_name;
        detail := 'RLS on with no client policies — default deny. Used only by SECURITY DEFINER functions.';
        row_count := 0;
        return next;
      elsif isolated then
        severity := 'pass';
        check_id := 'rls_tenant';
        object_name := rel.table_name;
        detail := 'RLS on and policies scope by tenant or accessible accounts.';
        row_count := 0;
        return next;
      else
        severity := 'fail';
        check_id := 'rls_no_tenant';
        object_name := rel.table_name;
        detail := 'RLS is on but no policy filters tenant_id / current_tenant_id / accessible_account_ids.';
        row_count := 0;
        return next;
      end if;
    end if;

    if rel.table_name = 'integration_plugins' then
      execute format(
        'select count(*) from public.%I where tenant_id is not null and tenant_id not in (select id from public.tenants)',
        rel.table_name
      ) into orphan_n;
    else
      execute format(
        'select count(*) from public.%I where tenant_id is null or tenant_id not in (select id from public.tenants)',
        rel.table_name
      ) into orphan_n;
    end if;
    if orphan_n > 0 then
      severity := 'fail';
      check_id := 'orphan_tenant';
      object_name := rel.table_name;
      detail := 'Rows with null tenant_id or a tenant_id that is not in tenants.';
      row_count := orphan_n;
      return next;
    end if;
  end loop;

  execute $q$
    select count(*) from public.tickets t
    join public.accounts a on a.id = t.account_id
    where t.tenant_id is distinct from a.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'tickets.account_id';
    detail := 'Ticket tenant_id does not match the linked account tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.tickets t
    join public.profiles p on p.id = t.assignee_id
    where t.assignee_id is not null and t.tenant_id is distinct from p.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'tickets.assignee_id';
    detail := 'Ticket assigned to a profile on another tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.tickets t
    join public.profiles p on p.id = t.requester_id
    where t.requester_id is not null and t.tenant_id is distinct from p.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'tickets.requester_id';
    detail := 'Ticket requester belongs to another tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.assets a
    join public.accounts acc on acc.id = a.account_id
    where a.account_id is not null and a.tenant_id is distinct from acc.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'assets.account_id';
    detail := 'Asset tenant_id does not match the linked account tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.cmdb_items c
    join public.accounts a on a.id = c.account_id
    where c.account_id is not null and c.tenant_id is distinct from a.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'cmdb_items.account_id';
    detail := 'CI tenant_id does not match the linked account tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.account_members m
    join public.accounts a on a.id = m.account_id
    where m.tenant_id is distinct from a.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'account_members.account_id';
    detail := 'Membership tenant_id does not match the account tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.account_members m
    join public.profiles p on p.id = m.user_id
    where m.tenant_id is distinct from p.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'account_members.user_id';
    detail := 'Membership points at a user on another tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.assignment_groups g
    join public.accounts a on a.id = g.account_id
    where g.account_id is not null and g.tenant_id is distinct from a.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'assignment_groups.account_id';
    detail := 'Assignment group tenant_id does not match the account tenant.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.ticket_comments c
    join public.tickets t on t.id = c.ticket_id
    where c.tenant_id is distinct from t.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'ticket_comments.ticket_id';
    detail := 'Comment tenant_id does not match the parent ticket.';
    row_count := mismatch_n; return next;
  end if;

  execute $q$
    select count(*) from public.in_app_notifications n
    join public.profiles p on p.id = n.user_id
    where n.tenant_id is distinct from p.tenant_id
  $q$ into mismatch_n;
  if mismatch_n > 0 then
    severity := 'fail'; check_id := 'cross_tenant_fk'; object_name := 'in_app_notifications.user_id';
    detail := 'Inbox row tenant_id does not match the recipient profile.';
    row_count := mismatch_n; return next;
  end if;

  return;
end;
$$;

revoke all on function public.audit_tenant_isolation() from public, anon, authenticated;
grant execute on function public.audit_tenant_isolation() to service_role;
