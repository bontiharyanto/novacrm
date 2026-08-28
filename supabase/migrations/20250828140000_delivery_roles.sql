-- Dedicated Delivery roles.
-- PM Delivery and DCO are staff roles, but their delivery access is
-- constrained by account membership and application-level capabilities.

alter type public.app_role add value if not exists 'pm_delivery';
alter type public.app_role add value if not exists 'dco';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in (
    'agent', 'pm_delivery', 'dco', 'team_lead', 'supervisor',
    'manager', 'admin', 'superadmin'
  );
$$;

create or replace function public.is_delivery_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('pm_delivery', 'dco');
$$;

grant execute on function public.is_staff() to authenticated, anon, service_role;
grant execute on function public.is_delivery_role() to authenticated, anon, service_role;

alter table public.role_capabilities
  drop constraint if exists role_capabilities_role_check;

alter table public.role_capabilities
  add constraint role_capabilities_role_check
  check (role in (
    'customer', 'agent', 'pm_delivery', 'dco', 'team_lead',
    'supervisor', 'manager', 'admin', 'superadmin'
  ));

drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    requester_id = auth.uid()
    or public.is_team_lead_role()
    or public.is_delivery_role()
    or (
      public.current_app_role() = 'agent'
      and (
        assignee_id = auth.uid()
        or (created_by = auth.uid() and assignee_id is null)
      )
    )
  )
);

drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets
for update using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    requester_id = auth.uid()
    or public.is_team_lead_role()
    or public.is_delivery_role()
    or (
      public.current_app_role() = 'agent'
      and (
        assignee_id = auth.uid()
        or (created_by = auth.uid() and assignee_id is null)
      )
    )
  )
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    requester_id = auth.uid()
    or public.is_team_lead_role()
    or public.is_delivery_role()
    or public.current_app_role() = 'agent'
  )
);

drop policy if exists ticket_tasks_insert on public.ticket_tasks;
create policy ticket_tasks_insert on public.ticket_tasks
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in (
    'admin', 'agent', 'pm_delivery', 'dco', 'manager',
    'supervisor', 'team_lead', 'superadmin'
  )
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_id and t.tenant_id = ticket_tasks.tenant_id
  )
);

drop policy if exists ticket_tasks_update on public.ticket_tasks;
create policy ticket_tasks_update on public.ticket_tasks
for update using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in (
    'admin', 'agent', 'pm_delivery', 'dco', 'manager',
    'supervisor', 'team_lead', 'superadmin'
  )
) with check (
  tenant_id = public.current_tenant_id()
);

drop policy if exists ticket_tasks_delete on public.ticket_tasks;
create policy ticket_tasks_delete on public.ticket_tasks
for delete using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in (
    'admin', 'manager', 'supervisor', 'superadmin'
  )
);

drop policy if exists delivery_projects_select on public.delivery_projects;
create policy delivery_projects_select on public.delivery_projects
for select using (
  tenant_id = public.current_tenant_id()
  and (
    (
      public.is_staff()
      and (
        not public.is_delivery_role()
        or account_id = any (public.accessible_account_ids())
      )
    )
    or account_id = any (public.accessible_account_ids())
  )
);

drop policy if exists delivery_projects_write on public.delivery_projects;
drop policy if exists delivery_projects_insert on public.delivery_projects;
create policy delivery_projects_insert on public.delivery_projects
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.current_app_role() = 'pm_delivery'
      and account_id = any (public.accessible_account_ids())
    )
  )
);

drop policy if exists delivery_projects_update on public.delivery_projects;
create policy delivery_projects_update on public.delivery_projects
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.is_delivery_role()
      and account_id = any (public.accessible_account_ids())
    )
  )
 ) with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.is_delivery_role()
      and account_id = any (public.accessible_account_ids())
    )
  )
);

drop policy if exists delivery_projects_delete on public.delivery_projects;
create policy delivery_projects_delete on public.delivery_projects
for delete using (
  tenant_id = public.current_tenant_id()
  and public.is_manager_role()
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
        (
          public.is_staff()
          and (
            not public.is_delivery_role()
            or p.account_id = any (public.accessible_account_ids())
          )
        )
        or p.account_id = any (public.accessible_account_ids())
      )
  )
);

drop policy if exists delivery_work_orders_write on public.delivery_work_orders;
drop policy if exists delivery_work_orders_insert on public.delivery_work_orders;
create policy delivery_work_orders_insert on public.delivery_work_orders
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.current_app_role() = 'dco'
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
);

drop policy if exists delivery_work_orders_update on public.delivery_work_orders;
create policy delivery_work_orders_update on public.delivery_work_orders
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.current_app_role() = 'dco'
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
 ) with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.current_app_role() = 'dco'
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
);

drop policy if exists delivery_work_orders_delete on public.delivery_work_orders;
create policy delivery_work_orders_delete on public.delivery_work_orders
for delete using (
  tenant_id = public.current_tenant_id()
  and public.is_manager_role()
);

drop policy if exists delivery_phases_write on public.delivery_phases;
drop policy if exists delivery_phases_insert on public.delivery_phases;
create policy delivery_phases_insert on public.delivery_phases
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.is_delivery_role()
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
);

drop policy if exists delivery_phases_update on public.delivery_phases;
create policy delivery_phases_update on public.delivery_phases
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.is_delivery_role()
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
 ) with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_manager_role()
    or (
      public.is_delivery_role()
      and exists (
        select 1 from public.delivery_projects p
        where p.id = project_id
          and p.account_id = any (public.accessible_account_ids())
      )
    )
  )
);

drop policy if exists delivery_phases_delete on public.delivery_phases;
create policy delivery_phases_delete on public.delivery_phases
for delete using (
  tenant_id = public.current_tenant_id()
  and public.is_manager_role()
);

drop policy if exists integration_events_staff on public.integration_events;
create policy integration_events_admin on public.integration_events
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
);

notify pgrst, 'reload schema';
