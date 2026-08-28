-- Delivery projects mirrored from an external Work Order Management CRM.
-- The external CRM owns the commercial project; NovaCRM owns execution tasks.

alter table public.accounts
  add column if not exists external_provider text,
  add column if not exists external_id text;

create unique index if not exists idx_accounts_external
  on public.accounts (tenant_id, external_provider, external_id)
  where external_provider is not null and external_id is not null;

create table if not exists public.delivery_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  external_provider text not null default 'work_order_crm',
  external_id text not null,
  name text not null,
  description text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'blocked', 'completed', 'cancelled')),
  execution_mode text not null default 'sequential'
    check (execution_mode in ('sequential', 'parallel')),
  pm_id uuid references public.profiles(id) on delete set null,
  dco_id uuid references public.profiles(id) on delete set null,
  planned_start date,
  planned_end date,
  completed_at timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (tenant_id, external_provider, external_id)
);

create index if not exists idx_delivery_projects_account
  on public.delivery_projects (tenant_id, account_id, status);

create table if not exists public.delivery_work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete set null,
  external_provider text not null default 'work_order_crm',
  external_id text not null,
  number text not null,
  title text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (tenant_id, external_provider, external_id)
);

create index if not exists idx_delivery_work_orders_project
  on public.delivery_work_orders (tenant_id, project_id, status);

create table if not exists public.delivery_phases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  work_order_id uuid references public.delivery_work_orders(id) on delete cascade,
  phase_key text not null,
  title text not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'blocked', 'completed', 'cancelled')),
  sort_order int not null default 0,
  customer_visible boolean not null default true,
  planned_start date,
  planned_end date,
  completed_at timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (project_id, phase_key)
);

create index if not exists idx_delivery_phases_project
  on public.delivery_phases (tenant_id, project_id, sort_order);

alter table public.tickets
  add column if not exists delivery_project_id uuid references public.delivery_projects(id) on delete set null;

alter table public.ticket_tasks
  add column if not exists delivery_project_id uuid references public.delivery_projects(id) on delete set null,
  add column if not exists delivery_phase_id uuid references public.delivery_phases(id) on delete set null,
  add column if not exists customer_visible boolean not null default false,
  add column if not exists customer_title text;

create index if not exists idx_tickets_delivery_project
  on public.tickets (tenant_id, delivery_project_id)
  where delivery_project_id is not null;

create index if not exists idx_ticket_tasks_delivery_phase
  on public.ticket_tasks (tenant_id, delivery_project_id, delivery_phase_id, sort_order);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  event_type text not null,
  external_event_id text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempts int not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, idempotency_key)
);

create index if not exists idx_integration_events_retry
  on public.integration_events (tenant_id, provider, status, created_at);

insert into public.integration_plugins (
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
select
  null,
  'work_order_crm',
  'Work Order Management CRM',
  'Closed Won, project, work order & phase sync',
  'crm',
  'fields',
  '[
    {"key":"baseUrl","label":"Base URL","type":"url","required":true},
    {"key":"webhookUrl","label":"Outbound webhook URL","type":"url","required":false},
    {"key":"apiKey","label":"API key","type":"password","secret":true,"required":true},
    {"key":"webhookSecret","label":"Webhook secret","type":"password","secret":true,"required":true}
  ]'::jsonb,
  'Configure the CRM API and send signed events to the NovaCRM tenant webhook.',
  'The Work Order CRM is the source of truth. NovaCRM mirrors projects and executes delivery tasks.',
  '{"kind":"save"}'::jsonb,
  75,
  true
where not exists (
  select 1 from public.integration_plugins
  where tenant_id is null and slug = 'work_order_crm'
);

drop trigger if exists delivery_projects_updated_at on public.delivery_projects;
create trigger delivery_projects_updated_at
before update on public.delivery_projects
for each row execute function public.set_updated_at();

drop trigger if exists delivery_work_orders_updated_at on public.delivery_work_orders;
create trigger delivery_work_orders_updated_at
before update on public.delivery_work_orders
for each row execute function public.set_updated_at();

drop trigger if exists delivery_phases_updated_at on public.delivery_phases;
create trigger delivery_phases_updated_at
before update on public.delivery_phases
for each row execute function public.set_updated_at();

drop trigger if exists integration_events_updated_at on public.integration_events;
create trigger integration_events_updated_at
before update on public.integration_events
for each row execute function public.set_updated_at();

alter table public.delivery_projects enable row level security;
alter table public.delivery_work_orders enable row level security;
alter table public.delivery_phases enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists delivery_projects_select on public.delivery_projects;
create policy delivery_projects_select on public.delivery_projects
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_staff()
    or account_id = any (public.accessible_account_ids())
  )
);

drop policy if exists delivery_projects_write on public.delivery_projects;
create policy delivery_projects_write on public.delivery_projects
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists delivery_work_orders_select on public.delivery_work_orders;
create policy delivery_work_orders_select on public.delivery_work_orders
for select using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_work_orders.tenant_id
      and (
        public.is_staff()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_work_orders_write on public.delivery_work_orders;
create policy delivery_work_orders_write on public.delivery_work_orders
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists delivery_phases_select on public.delivery_phases;
create policy delivery_phases_select on public.delivery_phases
for select using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_phases.tenant_id
      and (
        public.is_staff()
        or (
          p.account_id = any (public.accessible_account_ids())
          and delivery_phases.customer_visible = true
        )
      )
  )
);

drop policy if exists delivery_phases_write on public.delivery_phases;
create policy delivery_phases_write on public.delivery_phases
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists integration_events_staff on public.integration_events;
create policy integration_events_staff on public.integration_events
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert, update, delete on public.delivery_projects to authenticated, service_role;
grant select, insert, update, delete on public.delivery_work_orders to authenticated, service_role;
grant select, insert, update, delete on public.delivery_phases to authenticated, service_role;
grant select, insert, update, delete on public.integration_events to authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.delivery_projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.delivery_phases;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
