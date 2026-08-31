-- Public flyer lead capture. Leads are owned by the configured platform tenant.

create table if not exists public.demo_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  full_name text not null,
  company_name text not null,
  job_title text,
  employee_count text,
  phone text,
  email text not null,
  interest text not null check (interest in ('itsm', 'wfm', 'delivery', 'portal', 'integration')),
  message text,
  locale text not null default 'id' check (locale in ('id', 'en')),
  source text not null default 'flyer',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  privacy_consent boolean not null default false,
  marketing_consent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_demo_leads_tenant_status
  on public.demo_leads (tenant_id, status, created_at desc);
create index if not exists idx_demo_leads_email
  on public.demo_leads (tenant_id, email);

drop trigger if exists demo_leads_updated_at on public.demo_leads;
create trigger demo_leads_updated_at
before update on public.demo_leads
for each row execute function public.set_updated_at();

alter table public.demo_leads enable row level security;

drop policy if exists demo_leads_staff_read on public.demo_leads;
create policy demo_leads_staff_read on public.demo_leads
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'manager')
);

drop policy if exists demo_leads_staff_update on public.demo_leads;
create policy demo_leads_staff_update on public.demo_leads
for update using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'manager')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'manager')
);

grant select, update on public.demo_leads to authenticated;
grant all on public.demo_leads to service_role;
