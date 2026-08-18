-- Allow the header bell to carry WFM shift-swap notices.

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.in_app_notifications'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.in_app_notifications drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.in_app_notifications
  add constraint in_app_notifications_kind_check
  check (kind in ('assign', 'comment', 'status', 'rca', 'ticket', 'swap'));

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
    if target is null or kind not in ('assign', 'comment', 'status', 'rca', 'ticket', 'swap') then
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
