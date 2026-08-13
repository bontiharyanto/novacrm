-- Org tree (division → unit) and assignment groups. Group is not an HR level.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_unit_type') then
    create type public.org_unit_type as enum ('division', 'unit');
  end if;
  if not exists (select 1 from pg_type where typname = 'assignment_group_kind') then
    create type public.assignment_group_kind as enum ('assignment', 'cab', 'fulfillment', 'oncall');
  end if;
  if not exists (select 1 from pg_type where typname = 'assignment_group_member_role') then
    create type public.assignment_group_member_role as enum ('lead', 'member');
  end if;
end $$;

create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  parent_id uuid references public.org_units(id) on delete restrict,
  type public.org_unit_type not null,
  name text not null,
  slug text not null,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (account_id, slug)
);

create index if not exists idx_org_units_account on public.org_units (tenant_id, account_id, type);
create index if not exists idx_org_units_parent on public.org_units (parent_id);

create table if not exists public.assignment_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  name text not null,
  slug text not null,
  kind public.assignment_group_kind not null default 'assignment',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (account_id, slug)
);

create index if not exists idx_assignment_groups_account
  on public.assignment_groups (tenant_id, account_id, kind, is_active);

create table if not exists public.assignment_group_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.assignment_group_member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (group_id, user_id)
);

create index if not exists idx_assignment_group_members_user
  on public.assignment_group_members (tenant_id, user_id);

alter table public.profiles
  add column if not exists org_unit_id uuid references public.org_units(id) on delete set null;

alter table public.tickets
  add column if not exists group_id uuid references public.assignment_groups(id) on delete set null;

create index if not exists idx_tickets_group on public.tickets (tenant_id, group_id)
  where group_id is not null;

create index if not exists idx_profiles_org_unit on public.profiles (org_unit_id)
  where org_unit_id is not null;

drop trigger if exists org_units_updated_at on public.org_units;
create trigger org_units_updated_at
before update on public.org_units
for each row execute function public.set_updated_at();

drop trigger if exists assignment_groups_updated_at on public.assignment_groups;
create trigger assignment_groups_updated_at
before update on public.assignment_groups
for each row execute function public.set_updated_at();

drop trigger if exists assignment_group_members_updated_at on public.assignment_group_members;
create trigger assignment_group_members_updated_at
before update on public.assignment_group_members
for each row execute function public.set_updated_at();

create or replace function public.enforce_org_unit_tree()
returns trigger
language plpgsql
as $$
declare
  parent_type public.org_unit_type;
  parent_account uuid;
begin
  if new.type = 'division' then
    if new.parent_id is not null then
      raise exception 'Division cannot have a parent';
    end if;
    return new;
  end if;

  if new.parent_id is null then
    raise exception 'Unit must belong to a division';
  end if;

  select type, account_id into parent_type, parent_account
  from public.org_units
  where id = new.parent_id;

  if parent_type is distinct from 'division' then
    raise exception 'Unit parent must be a division';
  end if;
  if parent_account is distinct from new.account_id then
    raise exception 'Unit must stay in the same account as its division';
  end if;
  return new;
end;
$$;

drop trigger if exists org_units_tree on public.org_units;
create trigger org_units_tree
before insert or update of type, parent_id, account_id on public.org_units
for each row execute function public.enforce_org_unit_tree();

create or replace function public.enforce_ticket_group_account()
returns trigger
language plpgsql
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

drop trigger if exists tickets_group_same_account on public.tickets;
create trigger tickets_group_same_account
before insert or update of group_id, account_id on public.tickets
for each row execute function public.enforce_ticket_group_account();

-- Demo org on Internal
insert into public.org_units (id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_by)
values
  (
    '88888888-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    null,
    'division',
    'Divisi Operasi',
    'operasi',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '88888888-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    null,
    'division',
    'Divisi Layanan',
    'layanan',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.org_units (id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_by)
values
  (
    '88888888-0001-0001-0001-000000000011',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    '88888888-0001-0001-0001-000000000001',
    'unit',
    'Unit Network',
    'network',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '88888888-0001-0001-0001-000000000012',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    '88888888-0001-0001-0001-000000000001',
    'unit',
    'Unit Infra',
    'infra',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '88888888-0001-0001-0001-000000000013',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    '88888888-0001-0001-0001-000000000002',
    'unit',
    'Unit Service Desk',
    'service-desk',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

update public.profiles
set org_unit_id = '88888888-0001-0001-0001-000000000012'
where id = '22222222-2222-2222-2222-222222222222'
  and org_unit_id is null;

update public.profiles
set org_unit_id = '88888888-0001-0001-0001-000000000013'
where id = '33333333-3333-3333-3333-333333333333'
  and org_unit_id is null;

insert into public.assignment_groups (id, tenant_id, account_id, name, slug, kind, is_active, created_by)
values
  (
    '99999999-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'L1 Jakarta',
    'l1-jakarta',
    'assignment',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '99999999-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'CAB Infra',
    'cab-infra',
    'cab',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '99999999-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'Network On-call',
    'network-oncall',
    'oncall',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '99999999-0001-0001-0001-000000000004',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'Bank L1',
    'bank-l1',
    'assignment',
    true,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.assignment_group_members (tenant_id, group_id, user_id, role, created_by)
select tenant_id, group_id, user_id, role::public.assignment_group_member_role, created_by
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000002'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000002'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000003'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000004'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid)
) as m(tenant_id, group_id, user_id, role, created_by)
where exists (select 1 from public.profiles p where p.id = m.user_id)
on conflict (group_id, user_id) do nothing;

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000001'
where account_id = '55555555-0001-0001-0001-000000000001'
  and type in ('incident', 'problem', 'request')
  and group_id is null;

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000002'
where account_id = '55555555-0001-0001-0001-000000000001'
  and type = 'change'
  and group_id is null;

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000004'
where account_id = '55555555-0001-0001-0001-000000000002'
  and group_id is null;

alter table public.org_units enable row level security;
alter table public.assignment_groups enable row level security;
alter table public.assignment_group_members enable row level security;

drop policy if exists org_units_select on public.org_units;
create policy org_units_select on public.org_units
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists org_units_write on public.org_units;
create policy org_units_write on public.org_units
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
);

drop policy if exists assignment_groups_select on public.assignment_groups;
create policy assignment_groups_select on public.assignment_groups
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists assignment_groups_write on public.assignment_groups;
create policy assignment_groups_write on public.assignment_groups
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'admin'
);

drop policy if exists assignment_group_members_select on public.assignment_group_members;
create policy assignment_group_members_select on public.assignment_group_members
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and exists (
    select 1 from public.assignment_groups g
    where g.id = group_id
      and g.account_id = any (public.accessible_account_ids())
  )
);

drop policy if exists assignment_group_members_write on public.assignment_group_members;
create policy assignment_group_members_write on public.assignment_group_members
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

grant select, insert, update, delete on public.org_units to anon, authenticated, service_role;
grant select, insert, update, delete on public.assignment_groups to anon, authenticated, service_role;
grant select, insert, update, delete on public.assignment_group_members to anon, authenticated, service_role;
