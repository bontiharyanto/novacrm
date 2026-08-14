-- RBAC helpers + policy rewrite + demo staff logins

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('agent', 'team_lead', 'supervisor', 'manager', 'admin', 'superadmin');
$$;

create or replace function public.is_team_lead_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('team_lead', 'supervisor', 'manager', 'admin', 'superadmin');
$$;

create or replace function public.is_supervisor_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('supervisor', 'manager', 'admin', 'superadmin');
$$;

create or replace function public.is_manager_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('manager', 'admin', 'superadmin');
$$;

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'superadmin');
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'superadmin';
$$;

grant execute on function public.is_staff() to authenticated, anon, service_role;
grant execute on function public.is_team_lead_role() to authenticated, anon, service_role;
grant execute on function public.is_supervisor_role() to authenticated, anon, service_role;
grant execute on function public.is_manager_role() to authenticated, anon, service_role;
grant execute on function public.is_tenant_admin() to authenticated, anon, service_role;
grant execute on function public.is_superadmin() to authenticated, anon, service_role;

do $pol$
declare
  r record;
  using_expr text;
  check_expr text;
  cmd text;
  roles_sql text;
  perm text;
  sql text;
  admin_fn text;
begin
  for r in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      p.polname as policy_name,
      p.polcmd as pol_cmd,
      p.polpermissive as permissive,
      p.polroles as role_oids,
      pg_get_expr(p.polqual, p.polrelid) as using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%current_app_role()%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%current_app_role()%'
      )
  loop
    using_expr := r.using_expr;
    check_expr := r.check_expr;

    if r.table_name like 'wfm_%' then
      admin_fn := 'public.is_supervisor_role()';
    elsif r.table_name in (
      'org_units', 'assignment_groups', 'assignment_group_members',
      'sla_agreements', 'sla_calendars', 'sla_targets'
    ) then
      admin_fn := 'public.is_manager_role()';
    elsif r.table_name = 'tenants' then
      admin_fn := 'public.is_superadmin()';
    else
      admin_fn := 'public.is_tenant_admin()';
    end if;

    if using_expr is not null then
      using_expr := replace(using_expr, $s$current_app_role() = ANY (ARRAY['admin'::text, 'agent'::text])$s$, 'public.is_staff()');
      using_expr := replace(using_expr, $s$public.current_app_role() = ANY (ARRAY['admin'::text, 'agent'::text])$s$, 'public.is_staff()');
      using_expr := replace(using_expr, $s$current_app_role() = 'admin'::text$s$, admin_fn);
      using_expr := replace(using_expr, $s$public.current_app_role() = 'admin'::text$s$, admin_fn);
      using_expr := regexp_replace(using_expr, $s$current_app_role\(\) in \('admin', 'agent'\)$s$, 'public.is_staff()', 'g');
      using_expr := regexp_replace(using_expr, $s$current_app_role\(\) = 'admin'$s$, admin_fn, 'g');
    end if;
    if check_expr is not null then
      check_expr := replace(check_expr, $s$current_app_role() = ANY (ARRAY['admin'::text, 'agent'::text])$s$, 'public.is_staff()');
      check_expr := replace(check_expr, $s$public.current_app_role() = ANY (ARRAY['admin'::text, 'agent'::text])$s$, 'public.is_staff()');
      check_expr := replace(check_expr, $s$current_app_role() = 'admin'::text$s$, admin_fn);
      check_expr := replace(check_expr, $s$public.current_app_role() = 'admin'::text$s$, admin_fn);
      check_expr := regexp_replace(check_expr, $s$current_app_role\(\) in \('admin', 'agent'\)$s$, 'public.is_staff()', 'g');
      check_expr := regexp_replace(check_expr, $s$current_app_role\(\) = 'admin'$s$, admin_fn, 'g');
    end if;

    cmd := case r.pol_cmd
      when 'r' then 'SELECT'
      when 'a' then 'INSERT'
      when 'w' then 'UPDATE'
      when 'd' then 'DELETE'
      else 'ALL'
    end;
    perm := case when r.permissive then 'PERMISSIVE' else 'RESTRICTIVE' end;
    if r.role_oids is null or r.role_oids = '{0}'::oid[] or array_length(r.role_oids, 1) is null then
      roles_sql := 'public';
    else
      select string_agg(quote_ident(rol.rolname), ', ')
        into roles_sql
      from unnest(r.role_oids) as uid
      join pg_roles rol on rol.oid = uid;
      if roles_sql is null or roles_sql = '' then
        roles_sql := 'public';
      end if;
    end if;

    execute format('drop policy if exists %I on %I.%I', r.policy_name, r.schema_name, r.table_name);
    sql := format('create policy %I on %I.%I as %s for %s to %s', r.policy_name, r.schema_name, r.table_name, perm, cmd, roles_sql);
    if using_expr is not null then
      sql := sql || ' using (' || using_expr || ')';
    end if;
    if check_expr is not null then
      sql := sql || ' with check (' || check_expr || ')';
    end if;
    execute sql;
  end loop;
end $pol$;

do $$
declare
  tenant uuid := '11111111-1111-1111-1111-111111111111';
  admin_id uuid := '22222222-2222-2222-2222-222222222222';
  rec record;
begin
  for rec in
    select * from (
      values
        ('22222222-2222-2222-2222-222222222220'::uuid, 'superadmin@novacrm.app', 'Nova Superadmin', 'superadmin'),
        ('22222222-2222-2222-2222-222222222221'::uuid, 'manager@novacrm.app', 'Nova Manager', 'manager'),
        ('22222222-2222-2222-2222-222222222223'::uuid, 'spv@novacrm.app', 'Nova Supervisor', 'supervisor'),
        ('22222222-2222-2222-2222-222222222224'::uuid, 'lead@novacrm.app', 'Nova Team Lead', 'team_lead')
    ) as u(id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', rec.id, 'authenticated', 'authenticated',
      rec.email, extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', rec.full_name, 'role', rec.role, 'tenant_id', tenant::text),
      now(), now(), '', '', '', ''
    )
    on conflict (id) do update
      set raw_user_meta_data = excluded.raw_user_meta_data,
          email = excluded.email;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), rec.id,
      format('{"sub":"%s","email":"%s"}', rec.id, rec.email)::jsonb,
      'email', rec.id::text, now(), now(), now()
    )
    on conflict do nothing;

    insert into public.profiles (id, tenant_id, role, full_name, email, created_by)
    values (rec.id, tenant, rec.role::public.app_role, rec.full_name, rec.email, admin_id)
    on conflict (id) do update
      set role = excluded.role, full_name = excluded.full_name, email = excluded.email;

    insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
    select tenant, id, rec.id, 'member', admin_id
    from public.accounts
    where tenant_id = tenant
    on conflict (account_id, user_id) do nothing;
  end loop;
exception when others then
  raise notice 'RBAC demo users skipped (%).', SQLERRM;
end $$;
