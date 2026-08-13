-- UU PDP / security governance: privacy notice, RoPA, DSAR, breach 72h

create table if not exists public.governance_counters (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('dsar', 'breach', 'ropa')),
  last_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  primary key (tenant_id, kind)
);

alter table public.governance_counters enable row level security;

create or replace function public.next_governance_number(p_tenant uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  prefix text;
begin
  prefix := case p_kind
    when 'dsar' then 'DSAR'
    when 'breach' then 'BRH'
    when 'ropa' then 'ROPA'
    else 'GOV'
  end;

  insert into public.governance_counters (tenant_id, kind, last_value)
  values (p_tenant, p_kind, 1)
  on conflict (tenant_id, kind)
  do update set last_value = public.governance_counters.last_value + 1, updated_at = now()
  returning last_value into n;

  return prefix || lpad(n::text, 7, '0');
end;
$$;

create table if not exists public.privacy_settings (
  tenant_id uuid primary key references public.tenants(id) on delete restrict,
  dpo_name text,
  dpo_email text,
  dpo_phone text,
  controller_name text,
  controller_address text,
  notice_title text,
  notice_body text,
  lawful_basis_default text not null default 'contract'
    check (lawful_basis_default in (
      'consent', 'contract', 'legal_obligation', 'vital_interest', 'public_interest', 'legitimate_interest'
    )),
  cross_border_allowed boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.processing_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  number text,
  name text not null,
  purpose text not null,
  lawful_basis text not null default 'contract'
    check (lawful_basis in (
      'consent', 'contract', 'legal_obligation', 'vital_interest', 'public_interest', 'legitimate_interest'
    )),
  data_categories text[] not null default '{}',
  data_subjects text[] not null default '{}',
  recipients text,
  retention_days integer not null default 365,
  cross_border boolean not null default false,
  security_measures text,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, number)
);

create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  number text,
  request_type text not null check (request_type in (
    'access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'
  )),
  status text not null default 'received' check (status in (
    'received', 'verifying', 'in_progress', 'waiting', 'completed', 'rejected'
  )),
  subject_name text not null,
  subject_email text,
  subject_phone text,
  requester_id uuid,
  description text,
  due_date timestamptz,
  resolution text,
  assigned_to uuid,
  assigned_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, number)
);

create table if not exists public.data_breaches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  number text,
  title text not null,
  description text,
  discovered_at timestamptz not null default now(),
  notified_at timestamptz,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'detected' check (status in ('detected', 'contained', 'notified', 'closed')),
  affected_count integer not null default 0,
  data_categories text[] not null default '{}',
  notify_authority boolean not null default true,
  notify_subjects boolean not null default false,
  containment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, number)
);

create or replace function public.governance_set_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'processing_activities' and (new.number is null or new.number = '') then
    new.number := public.next_governance_number(new.tenant_id, 'ropa');
  elsif tg_table_name = 'data_subject_requests' and (new.number is null or new.number = '') then
    new.number := public.next_governance_number(new.tenant_id, 'dsar');
    if new.due_date is null then
      new.due_date := new.created_at + interval '30 days';
    end if;
  elsif tg_table_name = 'data_breaches' and (new.number is null or new.number = '') then
    new.number := public.next_governance_number(new.tenant_id, 'breach');
  end if;
  return new;
end;
$$;

drop trigger if exists processing_activities_set_number on public.processing_activities;
create trigger processing_activities_set_number
before insert on public.processing_activities
for each row execute function public.governance_set_number();

drop trigger if exists data_subject_requests_set_number on public.data_subject_requests;
create trigger data_subject_requests_set_number
before insert on public.data_subject_requests
for each row execute function public.governance_set_number();

drop trigger if exists data_breaches_set_number on public.data_breaches;
create trigger data_breaches_set_number
before insert on public.data_breaches
for each row execute function public.governance_set_number();

drop trigger if exists privacy_settings_updated_at on public.privacy_settings;
create trigger privacy_settings_updated_at
before update on public.privacy_settings
for each row execute function public.set_updated_at();

drop trigger if exists processing_activities_updated_at on public.processing_activities;
create trigger processing_activities_updated_at
before update on public.processing_activities
for each row execute function public.set_updated_at();

drop trigger if exists data_subject_requests_updated_at on public.data_subject_requests;
create trigger data_subject_requests_updated_at
before update on public.data_subject_requests
for each row execute function public.set_updated_at();

drop trigger if exists data_breaches_updated_at on public.data_breaches;
create trigger data_breaches_updated_at
before update on public.data_breaches
for each row execute function public.set_updated_at();

create index if not exists idx_processing_activities_tenant
  on public.processing_activities (tenant_id, status);
create index if not exists idx_dsar_tenant_status
  on public.data_subject_requests (tenant_id, status, due_date);
create index if not exists idx_dsar_requester
  on public.data_subject_requests (tenant_id, requester_id);
create index if not exists idx_breaches_tenant_status
  on public.data_breaches (tenant_id, status, discovered_at desc);

alter table public.privacy_settings enable row level security;
alter table public.processing_activities enable row level security;
alter table public.data_subject_requests enable row level security;
alter table public.data_breaches enable row level security;

drop policy if exists privacy_settings_read on public.privacy_settings;
create policy privacy_settings_read on public.privacy_settings
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_app_role() in ('admin', 'agent')
    or is_published = true
  )
);

drop policy if exists privacy_settings_write on public.privacy_settings;
create policy privacy_settings_write on public.privacy_settings
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

drop policy if exists processing_activities_staff on public.processing_activities;
create policy processing_activities_staff on public.processing_activities
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists dsar_staff on public.data_subject_requests;
create policy dsar_staff on public.data_subject_requests
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists dsar_self on public.data_subject_requests;
create policy dsar_self on public.data_subject_requests
for all using (
  tenant_id = public.current_tenant_id()
  and requester_id = auth.uid()
) with check (
  tenant_id = public.current_tenant_id()
  and requester_id = auth.uid()
);

drop policy if exists data_breaches_staff on public.data_breaches;
create policy data_breaches_staff on public.data_breaches
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.privacy_settings to anon, authenticated, service_role;
grant select, insert, update, delete on public.processing_activities to anon, authenticated, service_role;
grant select, insert, update, delete on public.data_subject_requests to anon, authenticated, service_role;
grant select, insert, update, delete on public.data_breaches to anon, authenticated, service_role;
grant select, insert, update, delete on public.governance_counters to anon, authenticated, service_role;
grant execute on function public.next_governance_number(uuid, text) to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.privacy_settings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.processing_activities;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.data_subject_requests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.data_breaches;
  exception when duplicate_object then null;
  end;
end $$;
