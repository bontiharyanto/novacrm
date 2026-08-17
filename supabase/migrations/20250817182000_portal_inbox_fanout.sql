-- Portal ticket create must fan out the header bell even when the actor is a customer.
-- Customers cannot INSERT in_app_notifications (RLS is_staff) and cannot read assignment groups.

create or replace function public.inbox_audience(p_group_id uuid, p_account_id uuid)
returns table(user_id uuid, role text)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select m.user_id
    from public.assignment_group_members m
    where m.tenant_id = public.current_tenant_id()
      and p_group_id is not null
      and m.group_id = p_group_id
    union
    select am.user_id
    from public.account_members am
    where am.tenant_id = public.current_tenant_id()
      and p_account_id is not null
      and am.account_id = p_account_id
      and coalesce(am.role, '') is distinct from 'portal'
    union
    select p.id
    from public.profiles p
    where p.tenant_id = public.current_tenant_id()
      and p.role = 'manager'
  )
  select p.id, p.role::text
  from public.profiles p
  join ids on ids.user_id = p.id
  where p.tenant_id = public.current_tenant_id()
    and p.role not in ('customer', 'admin', 'superadmin');
$$;

revoke all on function public.inbox_audience(uuid, uuid) from public;
grant execute on function public.inbox_audience(uuid, uuid) to authenticated, service_role;

create or replace function public.insert_in_app_notifications(items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid := public.current_tenant_id();
  item jsonb;
  n integer := 0;
  target uuid;
  kind text;
begin
  if auth.uid() is null or tid is null or items is null or jsonb_typeof(items) <> 'array' then
    return 0;
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    begin
      target := nullif(item->>'userId', '')::uuid;
    exception when others then
      continue;
    end;
    kind := coalesce(item->>'kind', 'ticket');
    if target is null or kind not in ('assign', 'comment', 'status', 'rca', 'ticket') then
      continue;
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = target and p.tenant_id = tid
    ) then
      continue;
    end if;

    insert into public.in_app_notifications (
      tenant_id, user_id, kind, title, body, href, ticket_id, created_by
    )
    values (
      tid,
      target,
      kind,
      left(coalesce(item->>'title', 'Ticket'), 180),
      left(coalesce(item->>'body', ''), 500),
      nullif(item->>'href', ''),
      case
        when coalesce(item->>'ticketId', '') ~* '^[0-9a-f-]{36}$' then (item->>'ticketId')::uuid
        else null
      end,
      auth.uid()
    );
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.insert_in_app_notifications(jsonb) from public;
grant execute on function public.insert_in_app_notifications(jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
