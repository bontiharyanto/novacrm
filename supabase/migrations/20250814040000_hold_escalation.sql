-- Hold / vendor wait reasons + support tier on assignment groups.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_pending_reason') then
    create type public.ticket_pending_reason as enum ('customer', 'vendor', 'change_freeze');
  end if;
  if not exists (select 1 from pg_type where typname = 'support_tier') then
    create type public.support_tier as enum ('l1', 'l2', 'l3');
  end if;
end $$;

alter table public.tickets
  add column if not exists pending_reason public.ticket_pending_reason,
  add column if not exists pending_note text;

alter table public.assignment_groups
  add column if not exists tier public.support_tier;

create index if not exists idx_tickets_pending
  on public.tickets (tenant_id, pending_reason)
  where pending_reason is not null;

create index if not exists idx_assignment_groups_tier
  on public.assignment_groups (account_id, tier)
  where tier is not null;

create or replace function public.enforce_ticket_pending()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('waiting', 'hold') then
    if new.pending_reason is null then
      if new.status = 'waiting' then
        new.pending_reason := case
          when new.type = 'change' then 'change_freeze'::public.ticket_pending_reason
          else 'customer'::public.ticket_pending_reason
        end;
      else
        new.pending_reason := case
          when new.type = 'change' then 'change_freeze'::public.ticket_pending_reason
          else 'vendor'::public.ticket_pending_reason
        end;
      end if;
    end if;
  else
    new.pending_reason := null;
    new.pending_note := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_pending on public.tickets;
create trigger tickets_pending
before insert or update of status, pending_reason, pending_note, type on public.tickets
for each row execute function public.enforce_ticket_pending();

update public.tickets
set pending_reason = case
  when status = 'waiting' and type = 'change' then 'change_freeze'::public.ticket_pending_reason
  when status = 'waiting' then 'customer'::public.ticket_pending_reason
  when status = 'hold' and type = 'change' then 'change_freeze'::public.ticket_pending_reason
  when status = 'hold' then 'vendor'::public.ticket_pending_reason
  else pending_reason
end
where status in ('waiting', 'hold')
  and pending_reason is null;

update public.assignment_groups
set tier = 'l1'
where id in (
  '99999999-0001-0001-0001-000000000001',
  '99999999-0001-0001-0001-000000000004'
)
  and tier is null;

update public.assignment_groups
set tier = 'l2'
where id = '99999999-0001-0001-0001-000000000003'
  and tier is null;

insert into public.assignment_groups (id, tenant_id, account_id, name, slug, kind, tier, is_active, created_by)
values
  (
    '99999999-0001-0001-0001-000000000005',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'L2 Network',
    'l2-network',
    'assignment',
    'l2',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '99999999-0001-0001-0001-000000000006',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'L3 Infra',
    'l3-infra',
    'assignment',
    'l3',
    true,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.assignment_group_members (tenant_id, group_id, user_id, role, created_by)
select tenant_id, group_id, user_id, role::public.assignment_group_member_role, created_by
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000005'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000005'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000006'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid)
) as m(tenant_id, group_id, user_id, role, created_by)
where exists (select 1 from public.profiles p where p.id = m.user_id)
on conflict (group_id, user_id) do nothing;

update public.tickets
set
  pending_reason = 'vendor',
  pending_note = 'ISP Indosat · case 8821'
where title = 'WiFi lantai 2 putus'
  and status = 'hold';

update public.tickets
set
  pending_reason = 'customer',
  pending_note = 'Menunggu foto error printer'
where title = 'Printer offline'
  and status = 'waiting';

update public.tickets
set
  pending_reason = 'change_freeze',
  pending_note = 'Maintenance window Minggu 22:00'
where title = 'PostgreSQL minor patch'
  and status = 'hold';

update public.tickets
set
  group_id = '99999999-0001-0001-0001-000000000005',
  status = 'in_progress',
  pending_reason = null,
  pending_note = null
where title = 'Backup gagal semalam'
  and account_id = '55555555-0001-0001-0001-000000000001';

grant execute on function public.enforce_ticket_pending() to anon, authenticated, service_role;
