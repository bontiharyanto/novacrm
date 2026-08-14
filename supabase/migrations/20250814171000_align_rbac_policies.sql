-- Align RLS with CASL / ROLE_HINT.
-- CASL was allowing supervisor/manager actions that Postgres still treated as admin-only
-- (or as any staff). Ticket comments insert was tenant-only.

-- Accounts: manager+ (was tenant admin only)
drop policy if exists accounts_write_admin on public.accounts;
drop policy if exists accounts_write on public.accounts;
create policy accounts_write on public.accounts
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_manager_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_manager_role()
);

-- Membership: supervisor+ so SPV/manager can attach users they create
drop policy if exists account_members_write_admin on public.account_members;
drop policy if exists account_members_write on public.account_members;
create policy account_members_write on public.account_members
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

-- Profiles: supervisor+ may update staff they manage (app still uses canAssignRole)
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
for update using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

-- SLA: supervisor+ (was manager+)
drop policy if exists sla_agreements_write on public.sla_agreements;
create policy sla_agreements_write on public.sla_agreements
for all using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.is_supervisor_role()
);

drop policy if exists sla_calendars_write on public.sla_calendars;
create policy sla_calendars_write on public.sla_calendars
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
  and (account_id is null or account_id = any (public.accessible_account_ids()))
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
  and (account_id is null or account_id = any (public.accessible_account_ids()))
);

drop policy if exists sla_targets_write on public.sla_targets;
create policy sla_targets_write on public.sla_targets
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

-- Group membership: supervisor+ (user create + L1/L2)
drop policy if exists assignment_group_members_write on public.assignment_group_members;
create policy assignment_group_members_write on public.assignment_group_members
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

-- Catalog write: supervisor+ (read stays staff + portal)
drop policy if exists catalog_categories_staff on public.catalog_categories;
create policy catalog_categories_select_staff on public.catalog_categories
for select using (tenant_id = public.current_tenant_id() and public.is_staff());
create policy catalog_categories_write on public.catalog_categories
for all using (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
);

drop policy if exists catalog_variable_sets_staff on public.catalog_variable_sets;
create policy catalog_variable_sets_select_staff on public.catalog_variable_sets
for select using (tenant_id = public.current_tenant_id() and public.is_staff());
create policy catalog_variable_sets_write on public.catalog_variable_sets
for all using (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
);

drop policy if exists catalog_items_staff on public.catalog_items;
create policy catalog_items_select_staff on public.catalog_items
for select using (tenant_id = public.current_tenant_id() and public.is_staff());
create policy catalog_items_write on public.catalog_items
for all using (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id() and public.is_supervisor_role()
);

-- Workflows: any staff may read; manager+ writes
drop policy if exists workflow_all_staff on public.workflow_rules;
create policy workflow_select_staff on public.workflow_rules
for select using (tenant_id = public.current_tenant_id() and public.is_staff());
create policy workflow_write on public.workflow_rules
for all using (
  tenant_id = public.current_tenant_id() and public.is_manager_role()
) with check (
  tenant_id = public.current_tenant_id() and public.is_manager_role()
);

-- Comments: staff or the ticket requester (was tenant-only)
drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments
for insert with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_staff()
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.requester_id = auth.uid()
    )
  )
);

-- Ticket updates cannot move a row to an account the actor cannot see
drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets
for update using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (public.is_staff() or requester_id = auth.uid())
) with check (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (public.is_staff() or requester_id = auth.uid())
);
