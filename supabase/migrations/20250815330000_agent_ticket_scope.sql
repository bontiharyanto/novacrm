-- Agent sees only tickets assigned to them (plus unassigned ones they just created).
-- Team lead+ keep the full account-scoped desk queue.

drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and (
    requester_id = auth.uid()
    or public.is_team_lead_role()
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
    or public.current_app_role() = 'agent'
  )
);
