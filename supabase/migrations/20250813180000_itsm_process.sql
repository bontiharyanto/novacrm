-- ITIL process types (Incident / Problem / Change / Request) + SN-style numbers.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_type') then
    create type public.ticket_type as enum ('incident', 'problem', 'change', 'request');
  end if;
end $$;

alter table public.tickets
  add column if not exists type public.ticket_type not null default 'incident';

alter table public.tickets
  add column if not exists number text;

create table if not exists public.ticket_number_counters (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type public.ticket_type not null,
  last_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  primary key (tenant_id, type)
);

alter table public.ticket_number_counters enable row level security;

create or replace function public.next_ticket_number(p_tenant uuid, p_type public.ticket_type)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  prefix text;
begin
  prefix := case p_type
    when 'incident' then 'INC'
    when 'problem' then 'PRB'
    when 'change' then 'CHG'
    when 'request' then 'RITM'
  end;

  insert into public.ticket_number_counters (tenant_id, type, last_value)
  values (p_tenant, p_type, 1)
  on conflict (tenant_id, type)
  do update set last_value = public.ticket_number_counters.last_value + 1, updated_at = now()
  returning last_value into n;

  return prefix || lpad(n::text, 7, '0');
end;
$$;

create or replace function public.tickets_set_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.number is null or new.number = '' then
    new.number := public.next_ticket_number(new.tenant_id, new.type);
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_set_number on public.tickets;
create trigger tickets_set_number
before insert on public.tickets
for each row execute function public.tickets_set_number();

update public.tickets
set type = case
  when title ilike '%request%'
    or title ilike '%butuh akun%'
    or title ilike '%lisensi%'
    or title ilike '%password%'
    then 'request'::public.ticket_type
  when title ilike '%update windows%'
    then 'change'::public.ticket_type
  when title ilike '%lag%'
    or title ilike '%warning%'
    or title ilike '%backup gagal%'
    then 'problem'::public.ticket_type
  else 'incident'::public.ticket_type
end
where number is null;

do $$
declare
  r record;
begin
  for r in
    select id, tenant_id, type
    from public.tickets
    where number is null
    order by created_at, id
  loop
    update public.tickets
    set number = public.next_ticket_number(r.tenant_id, r.type)
    where id = r.id;
  end loop;
end $$;

alter table public.tickets
  alter column number set not null;

create unique index if not exists idx_tickets_tenant_number on public.tickets (tenant_id, number);
create index if not exists idx_tickets_tenant_type on public.tickets (tenant_id, type);
create index if not exists idx_tickets_tenant_assignee on public.tickets (tenant_id, assignee_id);

update public.tickets
set
  assignee_id = '33333333-3333-3333-3333-333333333333',
  assignee_name = 'Nova Agent'
where title in (
  'VPN tidak terhubung',
  'Aplikasi CRM lag',
  'Server database warning',
  'Backup gagal semalam',
  'Phishing email masuk'
)
and assignee_id is null;

update public.tickets
set requester_id = '44444444-4444-4444-4444-444444444444'
where requester_email = 'customer@novacrm.app'
  and requester_id is null;

comment on column public.tickets.type is 'ITIL process: incident, problem, change, request.';
comment on column public.tickets.number is 'Human ticket number, e.g. INC0000001.';

grant execute on function public.next_ticket_number(uuid, public.ticket_type) to anon, authenticated, service_role;
grant all on table public.ticket_number_counters to service_role;
