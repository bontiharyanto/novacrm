-- Accounts: customer vs Internal inside one operator tenant.
-- Isolates tickets, assets, and CMDB per account.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('internal', 'customer');
  end if;
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('active', 'paused', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'account_member_role') then
    create type public.account_member_role as enum ('owner', 'member', 'portal');
  end if;
end $$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  type public.account_type not null,
  name text not null,
  slug text not null,
  code text,
  status public.account_status not null default 'active',
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create unique index if not exists accounts_one_internal_per_tenant
  on public.accounts (tenant_id)
  where type = 'internal';

create index if not exists idx_accounts_tenant_type on public.accounts (tenant_id, type, status);

create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (account_id, user_id)
);

create index if not exists idx_account_members_user on public.account_members (tenant_id, user_id);
create index if not exists idx_account_members_account on public.account_members (account_id);

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists account_members_updated_at on public.account_members;
create trigger account_members_updated_at
before update on public.account_members
for each row execute function public.set_updated_at();

-- Demo accounts (idempotent)
insert into public.accounts (id, tenant_id, type, name, slug, code, status, created_by)
values
  (
    '55555555-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'internal',
    'Nova Internal',
    'internal',
    'INT',
    'active',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '55555555-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'PT Bank Nusantara',
    'bank-nusantara',
    'BNK',
    'active',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '55555555-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'PT Garuda Logistics',
    'garuda-logistics',
    'GRD',
    'active',
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
select tenant_id, account_id, user_id, role::public.account_member_role, created_by
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'owner', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000001'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000002'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'owner', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000002'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000002'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'portal', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000003'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'owner', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '55555555-0001-0001-0001-000000000003'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid)
) as m(tenant_id, account_id, user_id, role, created_by)
where exists (select 1 from public.profiles p where p.id = m.user_id)
on conflict (account_id, user_id) do nothing;

alter table public.assets add column if not exists account_id uuid references public.accounts(id) on delete restrict;
alter table public.cmdb_items add column if not exists account_id uuid references public.accounts(id) on delete restrict;
alter table public.tickets add column if not exists account_id uuid references public.accounts(id) on delete restrict;

-- Split existing demo inventory
update public.assets set account_id = '55555555-0001-0001-0001-000000000001'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and id in (
    'aaaaaaaa-0001-0001-0001-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000004',
    'aaaaaaaa-0001-0001-0001-000000000005',
    'aaaaaaaa-0001-0001-0001-000000000006'
  );

update public.assets set account_id = '55555555-0001-0001-0001-000000000002'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and id in (
    'aaaaaaaa-0001-0001-0001-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000007',
    'aaaaaaaa-0001-0001-0001-000000000009'
  );

update public.assets set account_id = '55555555-0001-0001-0001-000000000003'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and id in (
    'aaaaaaaa-0001-0001-0001-000000000008',
    'aaaaaaaa-0001-0001-0001-000000000010'
  );

update public.assets a
set account_id = coalesce((
  select id from public.accounts acc
  where acc.tenant_id = a.tenant_id and acc.type = 'internal'
  limit 1
), a.account_id)
where a.account_id is null;

update public.cmdb_items set account_id = '55555555-0001-0001-0001-000000000001'
where id in (
  'bbbbbbbb-0001-0001-0001-000000000001',
  'bbbbbbbb-0001-0001-0001-000000000002',
  'bbbbbbbb-0001-0001-0001-000000000003',
  'bbbbbbbb-0001-0001-0001-000000000004',
  'bbbbbbbb-0001-0001-0001-000000000005',
  'bbbbbbbb-0001-0001-0001-000000000006',
  'bbbbbbbb-0001-0001-0001-000000000007'
);

update public.cmdb_items set account_id = '55555555-0001-0001-0001-000000000002'
where id in (
  'bbbbbbbb-0001-0001-0001-000000000008',
  'bbbbbbbb-0001-0001-0001-000000000009',
  'bbbbbbbb-0001-0001-0001-000000000010'
);

-- Break relations that would cross accounts after the split
update public.cmdb_items
set relations = '[]'::jsonb
where id in (
  'bbbbbbbb-0001-0001-0001-000000000009',
  'bbbbbbbb-0001-0001-0001-000000000010'
);

insert into public.cmdb_items (id, tenant_id, account_id, asset_id, name, type, attributes, relations)
select v.id, v.tenant_id, v.account_id, v.asset_id, v.name, v.type, v.attributes, v.relations
from (
  values
    (
      'bbbbbbbb-0001-0001-0001-000000000011'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '55555555-0001-0001-0001-000000000003'::uuid,
      'aaaaaaaa-0001-0001-0001-000000000008'::uuid,
      'print-wh',
      'printer',
      '{"site":"gudang"}'::jsonb,
      '[]'::jsonb
    ),
    (
      'bbbbbbbb-0001-0001-0001-000000000012'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '55555555-0001-0001-0001-000000000003'::uuid,
      'aaaaaaaa-0001-0001-0001-000000000010'::uuid,
      'mobile-field-02',
      'endpoint',
      '{"owner":"sales"}'::jsonb,
      '[]'::jsonb
    )
) as v(id, tenant_id, account_id, asset_id, name, type, attributes, relations)
where exists (select 1 from public.assets a where a.id = v.asset_id)
on conflict (id) do nothing;

update public.cmdb_items c
set account_id = coalesce((
  select a.account_id from public.assets a where a.id = c.asset_id
), (
  select id from public.accounts acc
  where acc.tenant_id = c.tenant_id and acc.type = 'internal'
  limit 1
))
where c.account_id is null;

update public.tickets
set account_id = '55555555-0001-0001-0001-000000000002'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and requester_id = '44444444-4444-4444-4444-444444444444';

update public.tickets
set account_id = '55555555-0001-0001-0001-000000000001'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and account_id is null;

update public.tickets t
set asset_id = null
from public.assets a
where t.asset_id = a.id
  and t.account_id is distinct from a.account_id;

update public.tickets t
set account_id = coalesce((
  select id from public.accounts acc
  where acc.tenant_id = t.tenant_id and acc.type = 'internal'
  limit 1
), t.account_id)
where t.account_id is null;

alter table public.assets alter column account_id set not null;
alter table public.cmdb_items alter column account_id set not null;
alter table public.tickets alter column account_id set not null;

create index if not exists idx_assets_account on public.assets (tenant_id, account_id);
create index if not exists idx_cmdb_account on public.cmdb_items (tenant_id, account_id);
create index if not exists idx_tickets_account on public.tickets (tenant_id, account_id);

create or replace function public.accessible_account_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(id), '{}'::uuid[])
  from (
    select a.id
    from public.accounts a
    where a.tenant_id = public.current_tenant_id()
      and (
        public.current_app_role() = 'admin'
        or exists (
          select 1
          from public.account_members m
          where m.account_id = a.id
            and m.user_id = auth.uid()
        )
      )
  ) scoped;
$$;

create or replace function public.enforce_same_account_asset()
returns trigger
language plpgsql
as $$
declare
  asset_account uuid;
begin
  if new.asset_id is null then
    return new;
  end if;
  select account_id into asset_account from public.assets where id = new.asset_id;
  if asset_account is null then
    raise exception 'Linked asset was not found';
  end if;
  if asset_account is distinct from new.account_id then
    raise exception 'Asset must belong to the same account';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_cmdb_relations_same_account()
returns trigger
language plpgsql
as $$
declare
  rel jsonb;
  target uuid;
  target_account uuid;
begin
  if new.relations is null then
    return new;
  end if;
  for rel in select jsonb_array_elements(coalesce(new.relations, '[]'::jsonb))
  loop
    begin
      target := nullif(rel->>'targetId', '')::uuid;
    exception when others then
      target := null;
    end;
    if target is null then
      continue;
    end if;
    select account_id into target_account from public.cmdb_items where id = target;
    if target_account is null then
      raise exception 'CMDB relation target not found';
    end if;
    if target_account is distinct from new.account_id then
      raise exception 'CMDB relations cannot cross accounts';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists tickets_same_account_asset on public.tickets;
create trigger tickets_same_account_asset
before insert or update of asset_id, account_id on public.tickets
for each row execute function public.enforce_same_account_asset();

drop trigger if exists cmdb_same_account_asset on public.cmdb_items;
create trigger cmdb_same_account_asset
before insert or update of asset_id, account_id on public.cmdb_items
for each row execute function public.enforce_same_account_asset();

drop trigger if exists cmdb_relations_same_account on public.cmdb_items;
create trigger cmdb_relations_same_account
before insert or update of relations, account_id on public.cmdb_items
for each row execute function public.enforce_cmdb_relations_same_account();

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
for select using (id = any (public.accessible_account_ids()));

drop policy if exists accounts_write_admin on public.accounts;
create policy accounts_write_admin on public.accounts
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists account_members_select on public.account_members;
create policy account_members_select on public.account_members
for select using (account_id = any (public.accessible_account_ids()));

drop policy if exists account_members_write_admin on public.account_members;
create policy account_members_write_admin on public.account_members
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists assets_all_staff on public.assets;
drop policy if exists assets_select on public.assets;
drop policy if exists assets_write on public.assets;
create policy assets_select on public.assets
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);
create policy assets_write on public.assets
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists cmdb_all_staff on public.cmdb_items;
drop policy if exists cmdb_select on public.cmdb_items;
drop policy if exists cmdb_write on public.cmdb_items;
create policy cmdb_select on public.cmdb_items
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);
create policy cmdb_write on public.cmdb_items
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists tickets_select on public.tickets;
drop policy if exists tickets_insert on public.tickets;
drop policy if exists tickets_update on public.tickets;
create policy tickets_select on public.tickets
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);
create policy tickets_insert on public.tickets
for insert with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);
create policy tickets_update on public.tickets
for update using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.accounts;
  exception when duplicate_object then null;
  end;
end $$;

grant select, insert, update, delete on public.accounts to anon, authenticated, service_role;
grant select, insert, update, delete on public.account_members to anon, authenticated, service_role;
grant execute on function public.accessible_account_ids() to anon, authenticated, service_role;
