-- Nova Agent is available to all desk staff; persist threads for lead/SPV/manager too.

drop policy if exists assistant_threads_own on public.assistant_threads;
create policy assistant_threads_own on public.assistant_threads
for all using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
  and public.is_staff()
);
