-- NovaCRM foundation: tenants, profiles/RBAC, assets, CMDB, workflows,
-- ticket status alignment (hold), jsonb description, complete audit + RLS.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  accent_color text not null default '#3b82f6',
  timezone text not null default 'Asia/Jakarta',
  support_email text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

insert into public.tenants (id, name, slug, accent_color, timezone, support_email, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'NovaCRM Demo Tenant',
  'novacrm-demo',
  '#3b82f6',
  'Asia/Jakarta',
  'support@novacrm.app',
  'active'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Roles + profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'agent', 'customer');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  role public.app_role not null default 'customer',
  full_name text not null default '',
  email text,
  phone text,
  telegram_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_profiles_tenant_id on public.profiles (tenant_id);
create index if not exists idx_profiles_tenant_role on public.profiles (tenant_id, role);

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_tenant uuid := '11111111-1111-1111-1111-111111111111';
  meta_tenant uuid;
  meta_role public.app_role;
begin
  begin
    meta_tenant := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;
  exception when others then
    meta_tenant := null;
  end;

  begin
    meta_role := coalesce(nullif(new.raw_user_meta_data->>'role', '')::public.app_role, 'customer');
  exception when others then
    meta_role := 'customer';
  end;

  insert into public.profiles (id, tenant_id, role, full_name, email, created_by)
  values (
    new.id,
    coalesce(meta_tenant, fallback_tenant),
    meta_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    new.email,
    new.id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'asset_type') then
    create type public.asset_type as enum ('laptop', 'server', 'network', 'printer', 'mobile');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_status') then
    create type public.asset_status as enum ('active', 'in_repair', 'retired', 'lost');
  end if;
end $$;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  asset_tag text not null,
  type public.asset_type not null,
  brand text,
  model text,
  serial text,
  purchase_date date,
  cost numeric(14, 2),
  status public.asset_status not null default 'active',
  location text,
  assigned_to text,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, asset_tag)
);

create index if not exists idx_assets_tenant_status on public.assets (tenant_id, status);
create index if not exists idx_assets_tenant_type on public.assets (tenant_id, type);

-- ---------------------------------------------------------------------------
-- Tickets: status hold, description jsonb, FKs, audit
-- ---------------------------------------------------------------------------
alter table public.tickets alter column status drop default;
alter table public.tickets alter column status type text using status::text;

do $$
begin
  if exists (select 1 from pg_type where typname = 'ticket_status') then
    drop type public.ticket_status;
  end if;
end $$;

create type public.ticket_status as enum ('open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed');

alter table public.tickets
  alter column status type public.ticket_status using (
    case
      when status in ('on_hold', 'hold') then 'hold'
      else status
    end
  )::public.ticket_status;

alter table public.tickets alter column status set default 'open';

alter table public.tickets
  alter column description drop default;

alter table public.tickets
  alter column description type jsonb
  using jsonb_build_object('type', 'plain', 'text', coalesce(description::text, ''));

alter table public.tickets
  alter column description set default jsonb_build_object('type', 'plain', 'text', '');

alter table public.tickets
  alter column description set not null;

alter table public.tickets
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists requester_phone text,
  add column if not exists assignee_name text,
  add column if not exists assignee_chat_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_tenant_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_requester_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_requester_id_fkey
      foreign key (requester_id) references public.profiles(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_assignee_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_assignee_id_fkey
      foreign key (assignee_id) references public.profiles(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_asset_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_asset_id_fkey
      foreign key (asset_id) references public.assets(id) on delete set null;
  end if;
end $$;

alter table public.ticket_comments
  add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ticket_comments_tenant_id_fkey'
  ) then
    alter table public.ticket_comments
      add constraint ticket_comments_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CMDB
-- ---------------------------------------------------------------------------
create table if not exists public.cmdb_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  asset_id uuid references public.assets(id) on delete set null,
  name text not null,
  type text not null,
  attributes jsonb not null default '{}'::jsonb,
  relations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_cmdb_items_tenant on public.cmdb_items (tenant_id);
create index if not exists idx_cmdb_items_asset on public.cmdb_items (asset_id);

-- ---------------------------------------------------------------------------
-- Workflow rules
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  event text not null check (event in ('ticket.create', 'ticket.status_change', 'ticket.comment_add')),
  action text not null check (action in ('send_email', 'assign', 'change_status', 'create_asset')),
  target text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_workflow_rules_tenant_event
  on public.workflow_rules (tenant_id, event, is_active);

-- ---------------------------------------------------------------------------
-- Notification audit + unique channel per tenant
-- ---------------------------------------------------------------------------
alter table public.notification_logs
  add column if not exists updated_at timestamptz not null default now();

alter table public.notification_logs
  add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notification_channels_tenant_type_key'
  ) then
    alter table public.notification_channels
      add constraint notification_channels_tenant_type_key unique (tenant_id, type);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'notification_channels_tenant_id_fkey'
  ) then
    alter table public.notification_channels
      add constraint notification_channels_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'notification_logs_tenant_id_fkey'
  ) then
    alter table public.notification_logs
      add constraint notification_logs_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists assets_updated_at on public.assets;
create trigger assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

drop trigger if exists cmdb_items_updated_at on public.cmdb_items;
create trigger cmdb_items_updated_at
before update on public.cmdb_items
for each row execute function public.set_updated_at();

drop trigger if exists workflow_rules_updated_at on public.workflow_rules;
create trigger workflow_rules_updated_at
before update on public.workflow_rules
for each row execute function public.set_updated_at();

drop trigger if exists notification_logs_updated_at on public.notification_logs;
create trigger notification_logs_updated_at
before update on public.notification_logs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.cmdb_items enable row level security;
alter table public.workflow_rules enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.notification_channels enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "tickets_tenant_isolation" on public.tickets;
drop policy if exists "ticket_comments_tenant_isolation" on public.ticket_comments;
drop policy if exists "notification_channels_tenant_isolation" on public.notification_channels;
drop policy if exists "notification_logs_tenant_isolation" on public.notification_logs;

create policy tenants_select on public.tenants
for select using (id = public.current_tenant_id());

create policy tenants_update_admin on public.tenants
for update using (
  id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

create policy profiles_select on public.profiles
for select using (tenant_id = public.current_tenant_id());

create policy profiles_update_self on public.profiles
for update using (id = auth.uid());

create policy profiles_update_admin on public.profiles
for update using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

create policy assets_all_staff on public.assets
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

create policy cmdb_all_staff on public.cmdb_items
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

create policy workflow_all_staff on public.workflow_rules
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

create policy tickets_select on public.tickets
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);

create policy tickets_insert on public.tickets
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);

create policy tickets_update on public.tickets
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() in ('admin', 'agent')
    or requester_id = auth.uid()
  )
);

create policy ticket_comments_select on public.ticket_comments
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() in ('admin', 'agent')
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.requester_id = auth.uid()
    )
  )
);

create policy ticket_comments_insert on public.ticket_comments
for insert with check (
  tenant_id = public.current_tenant_id()
);

create policy notification_channels_admin on public.notification_channels
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

create policy notification_logs_select on public.notification_logs
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

create policy notification_logs_insert on public.notification_logs
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.tickets;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.ticket_comments;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.assets;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.cmdb_items;
  exception when duplicate_object then null;
  end;
end $$;
