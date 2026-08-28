-- Operational handover gate for Delivery projects.
-- A project must be accepted by Operations before it can be closed.

create table if not exists public.delivery_handovers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  status text not null default 'not_started'
    check (status in (
      'not_started', 'in_progress', 'under_review',
      'accepted', 'accepted_with_conditions', 'rejected'
    )),
  operational_accepted_by uuid references public.profiles(id) on delete set null,
  operational_accepted_at timestamptz,
  hypercare_start date,
  hypercare_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (tenant_id, project_id)
);

create table if not exists public.delivery_handover_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  item_key text not null,
  title text not null,
  required boolean not null default true,
  completed boolean not null default false,
  notes text not null default '',
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (project_id, item_key)
);

create table if not exists public.delivery_handover_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.delivery_projects(id) on delete cascade,
  action text not null
    check (action in ('submit', 'accept', 'accept_with_conditions', 'reject')),
  notes text not null default '',
  reviewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_delivery_handovers_project
  on public.delivery_handovers (tenant_id, project_id, status);

create index if not exists idx_delivery_handover_items_project
  on public.delivery_handover_items (tenant_id, project_id, completed);

create index if not exists idx_delivery_handover_reviews_project
  on public.delivery_handover_reviews (tenant_id, project_id, created_at desc);

drop trigger if exists delivery_handovers_updated_at on public.delivery_handovers;
create trigger delivery_handovers_updated_at
before update on public.delivery_handovers
for each row execute function public.set_updated_at();

drop trigger if exists delivery_handover_items_updated_at on public.delivery_handover_items;
create trigger delivery_handover_items_updated_at
before update on public.delivery_handover_items
for each row execute function public.set_updated_at();

drop trigger if exists delivery_handover_reviews_updated_at on public.delivery_handover_reviews;
create trigger delivery_handover_reviews_updated_at
before update on public.delivery_handover_reviews
for each row execute function public.set_updated_at();

create or replace function public.enforce_delivery_handover_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('accepted', 'accepted_with_conditions')
    and public.current_app_role() not in ('supervisor', 'manager', 'admin', 'superadmin') then
    raise exception 'Only Operations roles can accept a delivery handover';
  end if;

  if new.status = 'under_review'
    and public.current_app_role() not in ('pm_delivery', 'dco', 'manager', 'admin', 'superadmin') then
    raise exception 'Only delivery owners can submit a handover for review';
  end if;

  if new.operational_accepted_by is distinct from old.operational_accepted_by
    and public.current_app_role() not in ('supervisor', 'manager', 'admin', 'superadmin') then
    raise exception 'Only Operations roles can set the acceptance owner';
  end if;

  return new;
end;
$$;

drop trigger if exists delivery_handovers_transition on public.delivery_handovers;
create trigger delivery_handovers_transition
before update on public.delivery_handovers
for each row execute function public.enforce_delivery_handover_transition();

alter table public.delivery_handovers enable row level security;
alter table public.delivery_handover_items enable row level security;
alter table public.delivery_handover_reviews enable row level security;

drop policy if exists delivery_handovers_select on public.delivery_handovers;
create policy delivery_handovers_select on public.delivery_handovers
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handovers.tenant_id
      and (
        not public.is_delivery_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_handovers_insert on public.delivery_handovers;
create policy delivery_handovers_insert on public.delivery_handovers
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or public.current_app_role() in ('pm_delivery', 'dco')
  )
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handovers.tenant_id
      and (
        public.is_manager_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_handovers_update on public.delivery_handovers;
create policy delivery_handovers_update on public.delivery_handovers
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or public.current_app_role() in ('pm_delivery', 'dco', 'supervisor')
  )
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handovers.tenant_id
      and (
        public.is_manager_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
) with check (
  tenant_id = public.current_tenant_id()
);

drop policy if exists delivery_handover_items_select on public.delivery_handover_items;
create policy delivery_handover_items_select on public.delivery_handover_items
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handover_items.tenant_id
      and (
        not public.is_delivery_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_handover_items_insert on public.delivery_handover_items;
create policy delivery_handover_items_insert on public.delivery_handover_items
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or public.current_app_role() in ('pm_delivery', 'dco')
  )
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handover_items.tenant_id
      and (
        public.is_manager_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_handover_items_update on public.delivery_handover_items;
create policy delivery_handover_items_update on public.delivery_handover_items
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or public.current_app_role() in ('pm_delivery', 'dco')
  )
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handover_items.tenant_id
      and (
        public.is_manager_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
) with check (
  tenant_id = public.current_tenant_id()
);

drop policy if exists delivery_handover_reviews_select on public.delivery_handover_reviews;
create policy delivery_handover_reviews_select on public.delivery_handover_reviews
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handover_reviews.tenant_id
      and (
        not public.is_delivery_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_handover_reviews_insert on public.delivery_handover_reviews;
create policy delivery_handover_reviews_insert on public.delivery_handover_reviews
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and reviewer_id = auth.uid()
  and (
    (
      action = 'submit'
      and public.current_app_role() in ('pm_delivery', 'dco', 'manager', 'admin', 'superadmin')
    )
    or (
      action in ('accept', 'accept_with_conditions', 'reject')
      and public.current_app_role() in ('supervisor', 'manager', 'admin', 'superadmin')
    )
  )
  and exists (
    select 1 from public.delivery_projects p
    where p.id = project_id
      and p.tenant_id = delivery_handover_reviews.tenant_id
      and (
        not public.is_delivery_role()
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

revoke delete on public.delivery_handover_reviews from authenticated;

grant select, insert, update on public.delivery_handovers to authenticated, service_role;
grant select, insert, update on public.delivery_handover_items to authenticated, service_role;
grant select, insert on public.delivery_handover_reviews to authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.delivery_handovers;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.delivery_handover_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.delivery_handover_reviews;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
