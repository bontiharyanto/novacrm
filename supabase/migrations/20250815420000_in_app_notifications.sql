-- Per-user inbox for the header bell. Isolated by tenant + user.

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('assign', 'comment', 'status', 'rca', 'ticket')),
  title text not null,
  body text not null default '',
  href text,
  ticket_id uuid references public.tickets(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_in_app_notifications_inbox
  on public.in_app_notifications (tenant_id, user_id, created_at desc);

create index if not exists idx_in_app_notifications_unread
  on public.in_app_notifications (tenant_id, user_id)
  where read_at is null;

drop trigger if exists in_app_notifications_updated_at on public.in_app_notifications;
create trigger in_app_notifications_updated_at
before update on public.in_app_notifications
for each row execute function public.set_updated_at();

alter table public.in_app_notifications enable row level security;

drop policy if exists in_app_notifications_select on public.in_app_notifications;
create policy in_app_notifications_select on public.in_app_notifications
for select using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

drop policy if exists in_app_notifications_update on public.in_app_notifications;
create policy in_app_notifications_update on public.in_app_notifications
for update using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
) with check (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

drop policy if exists in_app_notifications_insert on public.in_app_notifications;
create policy in_app_notifications_insert on public.in_app_notifications
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'in_app_notifications'
  ) then
    alter publication supabase_realtime add table public.in_app_notifications;
  end if;
end
$$;

-- Integrity check must see assignment_groups regardless of the caller's RLS.
create or replace function public.enforce_ticket_group_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_account uuid;
begin
  if new.group_id is null then
    return new;
  end if;
  select account_id into group_account from public.assignment_groups where id = new.group_id;
  if group_account is null then
    raise exception 'Assignment group was not found';
  end if;
  if group_account is distinct from new.account_id then
    raise exception 'Assignment group must belong to the same account as the ticket';
  end if;
  return new;
end;
$$;

grant select, insert, update, delete on public.in_app_notifications to anon, authenticated, service_role;

notify pgrst, 'reload schema';
