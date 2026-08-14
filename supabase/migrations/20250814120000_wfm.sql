-- Workforce management: presence, roster, skills, dispatch, on-call.
-- Assignment groups remain queues. These tables answer who is eligible to take work.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wfm_presence_status') then
    create type public.wfm_presence_status as enum ('available', 'busy', 'break', 'offline');
  end if;
  if not exists (select 1 from pg_type where typname = 'wfm_time_off_type') then
    create type public.wfm_time_off_type as enum ('leave', 'sick', 'training', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'wfm_time_off_status') then
    create type public.wfm_time_off_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'wfm_dispatch_strategy') then
    create type public.wfm_dispatch_strategy as enum ('manual', 'least_loaded', 'round_robin', 'skill', 'oncall');
  end if;
  if not exists (select 1 from pg_type where typname = 'wfm_roster_source') then
    create type public.wfm_roster_source as enum ('planned', 'override');
  end if;
end $$;

create table if not exists public.wfm_presence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.wfm_presence_status not null default 'available',
  until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, user_id)
);

create table if not exists public.wfm_shift_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete restrict,
  name text not null,
  start_local time not null,
  end_local time not null,
  days smallint[] not null default '{1,2,3,4,5}',
  timezone text not null default 'Asia/Jakarta',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.wfm_roster_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  work_date date not null,
  template_id uuid not null references public.wfm_shift_templates(id) on delete restrict,
  source public.wfm_roster_source not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (user_id, group_id, work_date)
);

create index if not exists idx_wfm_roster_group_date
  on public.wfm_roster_entries (tenant_id, group_id, work_date);

create table if not exists public.wfm_time_off (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type public.wfm_time_off_type not null default 'leave',
  status public.wfm_time_off_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_wfm_time_off_user
  on public.wfm_time_off (tenant_id, user_id, starts_at, ends_at);

create table if not exists public.wfm_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  slug text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, slug)
);

create table if not exists public.wfm_agent_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.wfm_skills(id) on delete cascade,
  level smallint not null default 3 check (level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (user_id, skill_id)
);

create table if not exists public.wfm_dispatch_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  strategy public.wfm_dispatch_strategy not null default 'manual',
  max_open_tickets integer not null default 8 check (max_open_tickets between 1 and 50),
  required_skill_ids uuid[] not null default '{}',
  oncall_group_id uuid references public.assignment_groups(id) on delete set null,
  last_assignee_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (group_id)
);

create table if not exists public.wfm_oncall_rotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  name text not null,
  cadence_hours integer not null default 168 check (cadence_hours >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.wfm_oncall_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  rotation_id uuid not null references public.wfm_oncall_rotations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  primary_user_id uuid not null references public.profiles(id) on delete restrict,
  backup_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_wfm_oncall_slots_window
  on public.wfm_oncall_slots (tenant_id, rotation_id, starts_at, ends_at);

drop trigger if exists wfm_presence_updated_at on public.wfm_presence;
create trigger wfm_presence_updated_at before update on public.wfm_presence
for each row execute function public.set_updated_at();

drop trigger if exists wfm_shift_templates_updated_at on public.wfm_shift_templates;
create trigger wfm_shift_templates_updated_at before update on public.wfm_shift_templates
for each row execute function public.set_updated_at();

drop trigger if exists wfm_roster_entries_updated_at on public.wfm_roster_entries;
create trigger wfm_roster_entries_updated_at before update on public.wfm_roster_entries
for each row execute function public.set_updated_at();

drop trigger if exists wfm_time_off_updated_at on public.wfm_time_off;
create trigger wfm_time_off_updated_at before update on public.wfm_time_off
for each row execute function public.set_updated_at();

drop trigger if exists wfm_skills_updated_at on public.wfm_skills;
create trigger wfm_skills_updated_at before update on public.wfm_skills
for each row execute function public.set_updated_at();

drop trigger if exists wfm_agent_skills_updated_at on public.wfm_agent_skills;
create trigger wfm_agent_skills_updated_at before update on public.wfm_agent_skills
for each row execute function public.set_updated_at();

drop trigger if exists wfm_dispatch_policies_updated_at on public.wfm_dispatch_policies;
create trigger wfm_dispatch_policies_updated_at before update on public.wfm_dispatch_policies
for each row execute function public.set_updated_at();

drop trigger if exists wfm_oncall_rotations_updated_at on public.wfm_oncall_rotations;
create trigger wfm_oncall_rotations_updated_at before update on public.wfm_oncall_rotations
for each row execute function public.set_updated_at();

drop trigger if exists wfm_oncall_slots_updated_at on public.wfm_oncall_slots;
create trigger wfm_oncall_slots_updated_at before update on public.wfm_oncall_slots
for each row execute function public.set_updated_at();

alter table public.wfm_presence enable row level security;
alter table public.wfm_shift_templates enable row level security;
alter table public.wfm_roster_entries enable row level security;
alter table public.wfm_time_off enable row level security;
alter table public.wfm_skills enable row level security;
alter table public.wfm_agent_skills enable row level security;
alter table public.wfm_dispatch_policies enable row level security;
alter table public.wfm_oncall_rotations enable row level security;
alter table public.wfm_oncall_slots enable row level security;

drop policy if exists wfm_presence_select on public.wfm_presence;
create policy wfm_presence_select on public.wfm_presence
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_presence_write on public.wfm_presence;
create policy wfm_presence_write on public.wfm_presence
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and (public.current_app_role() = 'admin' or user_id = auth.uid())
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and (public.current_app_role() = 'admin' or user_id = auth.uid())
);

drop policy if exists wfm_templates_select on public.wfm_shift_templates;
create policy wfm_templates_select on public.wfm_shift_templates
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_templates_write on public.wfm_shift_templates;
create policy wfm_templates_write on public.wfm_shift_templates
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_roster_select on public.wfm_roster_entries;
create policy wfm_roster_select on public.wfm_roster_entries
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_roster_write on public.wfm_roster_entries;
create policy wfm_roster_write on public.wfm_roster_entries
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_time_off_select on public.wfm_time_off;
create policy wfm_time_off_select on public.wfm_time_off
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_time_off_insert on public.wfm_time_off;
create policy wfm_time_off_insert on public.wfm_time_off
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
  and (public.current_app_role() = 'admin' or user_id = auth.uid())
);

drop policy if exists wfm_time_off_update on public.wfm_time_off;
create policy wfm_time_off_update on public.wfm_time_off
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() = 'admin'
    or (user_id = auth.uid() and status = 'pending')
  )
);

drop policy if exists wfm_skills_select on public.wfm_skills;
create policy wfm_skills_select on public.wfm_skills
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_skills_write on public.wfm_skills;
create policy wfm_skills_write on public.wfm_skills
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_agent_skills_select on public.wfm_agent_skills;
create policy wfm_agent_skills_select on public.wfm_agent_skills
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_agent_skills_write on public.wfm_agent_skills;
create policy wfm_agent_skills_write on public.wfm_agent_skills
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_policies_select on public.wfm_dispatch_policies;
create policy wfm_policies_select on public.wfm_dispatch_policies
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_policies_write on public.wfm_dispatch_policies;
create policy wfm_policies_write on public.wfm_dispatch_policies
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_oncall_rotations_select on public.wfm_oncall_rotations;
create policy wfm_oncall_rotations_select on public.wfm_oncall_rotations
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_oncall_rotations_write on public.wfm_oncall_rotations;
create policy wfm_oncall_rotations_write on public.wfm_oncall_rotations
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists wfm_oncall_slots_select on public.wfm_oncall_slots;
create policy wfm_oncall_slots_select on public.wfm_oncall_slots
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists wfm_oncall_slots_write on public.wfm_oncall_slots;
create policy wfm_oncall_slots_write on public.wfm_oncall_slots
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

grant select, insert, update, delete on public.wfm_presence to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_shift_templates to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_roster_entries to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_time_off to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_skills to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_agent_skills to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_dispatch_policies to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_oncall_rotations to anon, authenticated, service_role;
grant select, insert, update, delete on public.wfm_oncall_slots to anon, authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.wfm_presence;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.wfm_roster_entries;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.wfm_oncall_slots;
exception when duplicate_object then null;
end $$;

-- Extra desk agents so roster/occupancy is usable (same password as demo: NovaCRM!2026)
do $$
declare
  tenant uuid := '11111111-1111-1111-1111-111111111111';
  admin_id uuid := '22222222-2222-2222-2222-222222222222';
  rec record;
begin
  for rec in
    select * from (
      values
        ('33333333-3333-3333-3333-333333333334'::uuid, 'sari.l1@novacrm.app', 'Sari L1', 'agent'),
        ('33333333-3333-3333-3333-333333333335'::uuid, 'budi.l1@novacrm.app', 'Budi L1', 'agent'),
        ('33333333-3333-3333-3333-333333333336'::uuid, 'dewi.l1@novacrm.app', 'Dewi L1', 'agent'),
        ('33333333-3333-3333-3333-333333333337'::uuid, 'raka.l2@novacrm.app', 'Raka L2', 'agent'),
        ('33333333-3333-3333-3333-333333333338'::uuid, 'maya.l3@novacrm.app', 'Maya L3', 'agent'),
        ('33333333-3333-3333-3333-333333333339'::uuid, 'andi.oncall@novacrm.app', 'Andi On-call', 'agent')
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
    on conflict (id) do nothing;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), rec.id,
      jsonb_build_object('sub', rec.id::text, 'email', rec.email),
      'email', rec.id::text, now(), now(), now()
    )
    on conflict do nothing;

    insert into public.profiles (id, tenant_id, role, full_name, email, created_by)
    values (rec.id, tenant, rec.role::public.app_role, rec.full_name, rec.email, admin_id)
    on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, role = excluded.role;
  end loop;
exception when others then
  raise notice 'WFM extra auth users skipped (%).', SQLERRM;
end $$;

insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
select '11111111-1111-1111-1111-111111111111', account_id, user_id, 'member', '22222222-2222-2222-2222-222222222222'
from (
  values
    ('55555555-0001-0001-0001-000000000001'::uuid),
    ('55555555-0001-0001-0001-000000000002'::uuid)
) as a(account_id)
cross join (
  values
    ('33333333-3333-3333-3333-333333333334'::uuid),
    ('33333333-3333-3333-3333-333333333335'::uuid),
    ('33333333-3333-3333-3333-333333333336'::uuid),
    ('33333333-3333-3333-3333-333333333337'::uuid),
    ('33333333-3333-3333-3333-333333333338'::uuid),
    ('33333333-3333-3333-3333-333333333339'::uuid)
) as u(user_id)
where exists (select 1 from public.profiles p where p.id = u.user_id)
on conflict (account_id, user_id) do nothing;

insert into public.assignment_group_members (tenant_id, group_id, user_id, role, created_by)
select tenant_id, group_id, user_id, role::public.assignment_group_member_role, created_by
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, '33333333-3333-3333-3333-333333333336'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000005'::uuid, '33333333-3333-3333-3333-333333333337'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000006'::uuid, '33333333-3333-3333-3333-333333333338'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000003'::uuid, '33333333-3333-3333-3333-333333333337'::uuid, 'member', '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '99999999-0001-0001-0001-000000000003'::uuid, '33333333-3333-3333-3333-333333333339'::uuid, 'lead', '22222222-2222-2222-2222-222222222222'::uuid)
) as m(tenant_id, group_id, user_id, role, created_by)
where exists (select 1 from public.profiles p where p.id = m.user_id)
  and exists (select 1 from public.assignment_groups g where g.id = m.group_id)
on conflict (group_id, user_id) do nothing;

insert into public.wfm_shift_templates (id, tenant_id, account_id, name, start_local, end_local, days, timezone, created_by)
values
  ('bbbbbbbb-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Pagi', '08:00', '16:00', '{1,2,3,4,5}', 'Asia/Jakarta', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Siang', '12:00', '20:00', '{1,2,3,4,5}', 'Asia/Jakarta', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Malam', '21:00', '05:00', '{1,2,3,4,5,6,7}', 'Asia/Jakarta', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'On-call window', '17:00', '08:00', '{1,2,3,4,5,6,7}', 'Asia/Jakarta', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.wfm_skills (id, tenant_id, name, slug, category, created_by)
values
  ('aaaaaaaa-0f01-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Network', 'network', 'infrastructure', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0f01-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Endpoint', 'endpoint', 'workplace', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0f01-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Database', 'database', 'infrastructure', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0f01-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Identity', 'identity', 'security', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.wfm_agent_skills (tenant_id, user_id, skill_id, level, created_by)
select tenant_id, user_id, skill_id, level, created_by
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000002'::uuid, 4, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000002'::uuid, 3, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333335'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000004'::uuid, 3, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333336'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000002'::uuid, 2, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333337'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000001'::uuid, 5, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333338'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000003'::uuid, 5, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333339'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000001'::uuid, 4, '22222222-2222-2222-2222-222222222222'::uuid),
    ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'aaaaaaaa-0f01-0001-0001-000000000003'::uuid, 4, '22222222-2222-2222-2222-222222222222'::uuid)
) as s(tenant_id, user_id, skill_id, level, created_by)
where exists (select 1 from public.profiles p where p.id = s.user_id)
on conflict (user_id, skill_id) do nothing;

insert into public.wfm_presence (tenant_id, user_id, status, created_by)
select '11111111-1111-1111-1111-111111111111', id, status::public.wfm_presence_status, '22222222-2222-2222-2222-222222222222'
from (
  values
    ('22222222-2222-2222-2222-222222222222'::uuid, 'available'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'available'),
    ('33333333-3333-3333-3333-333333333334'::uuid, 'available'),
    ('33333333-3333-3333-3333-333333333335'::uuid, 'busy'),
    ('33333333-3333-3333-3333-333333333336'::uuid, 'break'),
    ('33333333-3333-3333-3333-333333333337'::uuid, 'available'),
    ('33333333-3333-3333-3333-333333333338'::uuid, 'available'),
    ('33333333-3333-3333-3333-333333333339'::uuid, 'available')
) as p(id, status)
where exists (select 1 from public.profiles x where x.id = p.id)
on conflict (tenant_id, user_id) do update set status = excluded.status;

insert into public.wfm_time_off (tenant_id, user_id, starts_at, ends_at, type, status, note, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333336',
  date_trunc('day', timezone('Asia/Jakarta', now())) + interval '1 day' + interval '8 hours',
  date_trunc('day', timezone('Asia/Jakarta', now())) + interval '1 day' + interval '17 hours',
  'leave',
  'approved',
  'Cuti tahunan',
  '22222222-2222-2222-2222-222222222222'
where exists (select 1 from public.profiles where id = '33333333-3333-3333-3333-333333333336')
  and not exists (
    select 1 from public.wfm_time_off
    where user_id = '33333333-3333-3333-3333-333333333336'
      and note = 'Cuti tahunan'
  );

insert into public.wfm_roster_entries (tenant_id, user_id, group_id, work_date, template_id, source, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  staff.user_id,
  staff.group_id,
  d::date,
  staff.template_id,
  'planned',
  '22222222-2222-2222-2222-222222222222'
from generate_series(current_date - 1, current_date + 13, interval '1 day') as d
cross join (
  values
    ('33333333-3333-3333-3333-333333333333'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, 'bbbbbbbb-0001-0001-0001-000000000001'::uuid),
    ('33333333-3333-3333-3333-333333333334'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, 'bbbbbbbb-0001-0001-0001-000000000001'::uuid),
    ('33333333-3333-3333-3333-333333333335'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, 'bbbbbbbb-0001-0001-0001-000000000002'::uuid),
    ('33333333-3333-3333-3333-333333333336'::uuid, '99999999-0001-0001-0001-000000000001'::uuid, 'bbbbbbbb-0001-0001-0001-000000000002'::uuid),
    ('33333333-3333-3333-3333-333333333337'::uuid, '99999999-0001-0001-0001-000000000005'::uuid, 'bbbbbbbb-0001-0001-0001-000000000001'::uuid),
    ('33333333-3333-3333-3333-333333333338'::uuid, '99999999-0001-0001-0001-000000000006'::uuid, 'bbbbbbbb-0001-0001-0001-000000000001'::uuid),
    ('33333333-3333-3333-3333-333333333339'::uuid, '99999999-0001-0001-0001-000000000003'::uuid, 'bbbbbbbb-0001-0001-0001-000000000004'::uuid),
    ('33333333-3333-3333-3333-333333333337'::uuid, '99999999-0001-0001-0001-000000000003'::uuid, 'bbbbbbbb-0001-0001-0001-000000000004'::uuid)
) as staff(user_id, group_id, template_id)
join public.wfm_shift_templates t on t.id = staff.template_id
where exists (select 1 from public.profiles p where p.id = staff.user_id)
  and extract(isodow from d)::smallint = any (t.days)
on conflict (user_id, group_id, work_date) do nothing;

insert into public.wfm_dispatch_policies (
  tenant_id, group_id, strategy, max_open_tickets, required_skill_ids, oncall_group_id, created_by
)
select tenant_id, group_id, strategy::public.wfm_dispatch_strategy, max_open, skill_ids, oncall_group, created_by
from (
  values
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000001'::uuid,
      'least_loaded',
      6,
      '{}'::uuid[],
      '99999999-0001-0001-0001-000000000003'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000004'::uuid,
      'round_robin',
      8,
      '{}'::uuid[],
      null::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000005'::uuid,
      'skill',
      5,
      array['aaaaaaaa-0f01-0001-0001-000000000001'::uuid],
      '99999999-0001-0001-0001-000000000003'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000006'::uuid,
      'skill',
      4,
      array['aaaaaaaa-0f01-0001-0001-000000000003'::uuid],
      null::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000002'::uuid,
      'manual',
      8,
      '{}'::uuid[],
      null::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ),
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '99999999-0001-0001-0001-000000000003'::uuid,
      'oncall',
      10,
      '{}'::uuid[],
      null::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    )
) as p(tenant_id, group_id, strategy, max_open, skill_ids, oncall_group, created_by)
where exists (select 1 from public.assignment_groups g where g.id = p.group_id)
on conflict (group_id) do update set
  strategy = excluded.strategy,
  max_open_tickets = excluded.max_open_tickets,
  required_skill_ids = excluded.required_skill_ids,
  oncall_group_id = excluded.oncall_group_id;

insert into public.wfm_oncall_rotations (id, tenant_id, group_id, name, cadence_hours, created_by)
values (
  'dddddddd-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '99999999-0001-0001-0001-000000000003',
  'Network weekly',
  168,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.wfm_oncall_slots (tenant_id, rotation_id, starts_at, ends_at, primary_user_id, backup_user_id, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  'dddddddd-0001-0001-0001-000000000001',
  date_trunc('week', timezone('Asia/Jakarta', now())) + (n * interval '7 days'),
  date_trunc('week', timezone('Asia/Jakarta', now())) + ((n + 1) * interval '7 days'),
  case when n % 2 = 0 then '33333333-3333-3333-3333-333333333339'::uuid else '33333333-3333-3333-3333-333333333337'::uuid end,
  case when n % 2 = 0 then '33333333-3333-3333-3333-333333333337'::uuid else '33333333-3333-3333-3333-333333333333'::uuid end,
  '22222222-2222-2222-2222-222222222222'
from generate_series(0, 3) as n
where exists (select 1 from public.wfm_oncall_rotations where id = 'dddddddd-0001-0001-0001-000000000001')
  and not exists (
    select 1 from public.wfm_oncall_slots s
    where s.rotation_id = 'dddddddd-0001-0001-0001-000000000001'
      and s.starts_at = date_trunc('week', timezone('Asia/Jakarta', now())) + (n * interval '7 days')
  );

update public.workflow_rules
set
  target = 'wfm',
  definition = jsonb_set(
    coalesce(definition, '{}'::jsonb),
    '{nodes}',
    (
      select jsonb_agg(
        case
          when node->>'type' = 'action' and node->'data'->>'action' = 'assign'
            then jsonb_set(node, '{data,target}', '"wfm"')
          else node
        end
      )
      from jsonb_array_elements(coalesce(definition->'nodes', '[]'::jsonb)) as node
    )
  )
where name = 'Auto assign new ticket'
  and tenant_id = '11111111-1111-1111-1111-111111111111';
