-- Roster edits are a supervisor+ job (SPV / manager / admin), matching CASL create Wfm.
-- Previously only tenant admin could INSERT, so the + cell looked clickable and then no-op.

drop policy if exists wfm_roster_write on public.wfm_roster_entries;
create policy wfm_roster_write on public.wfm_roster_entries
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);
