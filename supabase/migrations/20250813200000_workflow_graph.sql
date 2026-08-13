-- Workflow graph definition + run audit

alter table public.workflow_rules
  add column if not exists definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb;

update public.workflow_rules
set definition = jsonb_build_object(
  'nodes', jsonb_build_array(
    jsonb_build_object(
      'id', 'trigger',
      'type', 'trigger',
      'position', jsonb_build_object('x', 80, 'y', 160),
      'data', jsonb_build_object('event', event)
    ),
    jsonb_build_object(
      'id', 'action-1',
      'type', 'action',
      'position', jsonb_build_object('x', 380, 'y', 160),
      'data', jsonb_build_object('action', action, 'target', coalesce(target, ''))
    )
  ),
  'edges', jsonb_build_array(
    jsonb_build_object('id', 'e1', 'source', 'trigger', 'target', 'action-1')
  )
)
where coalesce(definition, '{"nodes":[]}'::jsonb) -> 'nodes' = '[]'::jsonb;

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  rule_id uuid references public.workflow_rules(id) on delete set null,
  ticket_id uuid,
  event text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'sent', 'failed')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_workflow_runs_tenant
  on public.workflow_runs (tenant_id, created_at desc);

alter table public.workflow_runs enable row level security;

drop policy if exists workflow_runs_staff on public.workflow_runs;
create policy workflow_runs_staff on public.workflow_runs
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.workflow_runs to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.workflow_runs;
  exception when duplicate_object then
    null;
  end;
end $$;
