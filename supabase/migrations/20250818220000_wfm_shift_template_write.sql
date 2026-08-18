-- Shift templates are tenant master data. SPV/manager/admin may edit hours.
-- Previously only tenant admin could write, so customer hour changes had no desk UI path.

drop policy if exists wfm_templates_write on public.wfm_shift_templates;
create policy wfm_templates_write on public.wfm_shift_templates
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_supervisor_role()
);

create unique index if not exists idx_wfm_shift_templates_tenant_name
  on public.wfm_shift_templates (tenant_id, lower(name));
