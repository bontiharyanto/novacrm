-- Daily operations report email. One schedule per tenant. Worker sends after send_hour in timezone.

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  is_active boolean not null default false,
  recipients text not null default '',
  range_days integer not null default 7,
  send_hour integer not null default 7,
  timezone text not null default 'Asia/Jakarta',
  include_aging boolean not null default true,
  last_sent_on date,
  last_sent_at timestamptz,
  last_ok boolean,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint report_schedules_tenant_unique unique (tenant_id),
  constraint report_schedules_range_check check (range_days in (1, 7, 30)),
  constraint report_schedules_hour_check check (send_hour between 0 and 23),
  constraint report_schedules_tz_check check (char_length(timezone) between 3 and 80)
);

create index if not exists idx_report_schedules_active
  on public.report_schedules (is_active, send_hour)
  where is_active = true;

drop trigger if exists report_schedules_updated_at on public.report_schedules;
create trigger report_schedules_updated_at
before update on public.report_schedules
for each row execute function public.set_updated_at();

alter table public.report_schedules enable row level security;

drop policy if exists report_schedules_admin on public.report_schedules;
create policy report_schedules_admin on public.report_schedules
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'superadmin')
);

grant select, insert, update, delete on public.report_schedules to authenticated, service_role;

notify pgrst, 'reload schema';
