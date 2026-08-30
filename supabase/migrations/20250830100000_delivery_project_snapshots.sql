-- Daily delivery project snapshots for historical progress reporting.

create table if not exists public.delivery_project_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  snapshot_date date not null,
  progress numeric(5, 2) not null default 0
    check (progress >= 0 and progress <= 100),
  status text not null
    check (status in ('planned', 'in_progress', 'blocked', 'completed', 'cancelled')),
  phase_count integer not null default 0 check (phase_count >= 0),
  completed_phase_count integer not null default 0 check (completed_phase_count >= 0),
  blocked_phase_count integer not null default 0 check (blocked_phase_count >= 0),
  task_count integer not null default 0 check (task_count >= 0),
  completed_task_count integer not null default 0 check (completed_task_count >= 0),
  open_task_count integer not null default 0 check (open_task_count >= 0),
  overdue_task_count integer not null default 0 check (overdue_task_count >= 0),
  handover_status text,
  handover_progress numeric(5, 2)
    check (handover_progress is null or (handover_progress >= 0 and handover_progress <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (tenant_id, project_id, snapshot_date)
);

create index if not exists idx_delivery_project_snapshots_lookup
  on public.delivery_project_snapshots (tenant_id, project_id, snapshot_date desc);

drop trigger if exists delivery_project_snapshots_updated_at on public.delivery_project_snapshots;
create trigger delivery_project_snapshots_updated_at
before update on public.delivery_project_snapshots
for each row execute function public.set_updated_at();

alter table public.delivery_project_snapshots enable row level security;

drop policy if exists delivery_project_snapshots_select on public.delivery_project_snapshots;
create policy delivery_project_snapshots_select on public.delivery_project_snapshots
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists delivery_project_snapshots_write on public.delivery_project_snapshots;
create policy delivery_project_snapshots_write on public.delivery_project_snapshots
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert, update, delete on public.delivery_project_snapshots to authenticated, service_role;
