-- WBS support: per-task activity history and explicit dependencies.

drop policy if exists ticket_tasks_select on public.ticket_tasks;
create policy ticket_tasks_select on public.ticket_tasks
for select using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1 from public.tickets ticket
    where ticket.id = ticket_id
      and ticket.tenant_id = ticket_tasks.tenant_id
      and (
        public.is_staff()
        or ticket.account_id = any (public.accessible_account_ids())
      )
  )
  and (
    public.is_staff()
    or customer_visible = true
  )
);

create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.ticket_tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'progress'
    check (kind in ('progress', 'comment', 'blocker', 'decision', 'status_change', 'handover')),
  body text not null,
  status_from text,
  status_to text,
  customer_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_task_activities_task
  on public.task_activities (tenant_id, task_id, created_at desc);

create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  predecessor_task_id uuid not null references public.ticket_tasks(id) on delete cascade,
  successor_task_id uuid not null references public.ticket_tasks(id) on delete cascade,
  dependency_type text not null default 'finish_to_start'
    check (dependency_type in ('finish_to_start')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (predecessor_task_id, successor_task_id),
  check (predecessor_task_id <> successor_task_id)
);

create index if not exists idx_task_dependencies_successor
  on public.task_dependencies (tenant_id, successor_task_id);

create index if not exists idx_task_dependencies_predecessor
  on public.task_dependencies (tenant_id, predecessor_task_id);

drop trigger if exists task_activities_updated_at on public.task_activities;
create trigger task_activities_updated_at
before update on public.task_activities
for each row execute function public.set_updated_at();

drop trigger if exists task_dependencies_updated_at on public.task_dependencies;
create trigger task_dependencies_updated_at
before update on public.task_dependencies
for each row execute function public.set_updated_at();

alter table public.task_activities enable row level security;
alter table public.task_dependencies enable row level security;

drop policy if exists task_activities_select on public.task_activities;
create policy task_activities_select on public.task_activities
for select using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1
    from public.ticket_tasks task
    where task.id = public.task_activities.task_id
      and task.tenant_id = task_activities.tenant_id
      and exists (
        select 1 from public.tickets ticket
        where ticket.id = task.ticket_id
          and ticket.tenant_id = task.tenant_id
          and (
            public.is_staff()
            or ticket.account_id = any (public.accessible_account_ids())
          )
      )
      and (
        public.is_staff()
        or (
          task.customer_visible = true
          and public.task_activities.customer_visible = true
        )
      )
  )
);

drop policy if exists task_activities_write on public.task_activities;
create policy task_activities_write on public.task_activities
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

drop policy if exists task_dependencies_staff on public.task_dependencies;
create policy task_dependencies_staff on public.task_dependencies
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert, update, delete on public.task_activities to authenticated, service_role;
grant select, insert, update, delete on public.task_dependencies to authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.task_activities;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
