-- Change CAB: risk/window on tickets + approval audit

alter table public.tickets
  add column if not exists change_type text check (change_type in ('standard', 'normal', 'emergency'));

alter table public.tickets
  add column if not exists risk_level text check (risk_level in ('low', 'medium', 'high', 'critical'));

alter table public.tickets
  add column if not exists planned_start timestamptz;

alter table public.tickets
  add column if not exists planned_end timestamptz;

alter table public.tickets
  add column if not exists implementation_plan text;

alter table public.tickets
  add column if not exists backout_plan text;

update public.tickets
set
  change_type = coalesce(change_type, 'normal'),
  risk_level = coalesce(risk_level, priority::text)
where type = 'change';

create table if not exists public.cab_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  approver_id uuid not null,
  approver_name text,
  decision text not null check (decision in ('approved', 'rejected', 'deferred')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (ticket_id, approver_id)
);

create index if not exists idx_cab_approvals_ticket
  on public.cab_approvals (tenant_id, ticket_id, created_at desc);

drop trigger if exists cab_approvals_updated_at on public.cab_approvals;
create trigger cab_approvals_updated_at
before update on public.cab_approvals
for each row execute function public.set_updated_at();

alter table public.cab_approvals enable row level security;

drop policy if exists cab_approvals_staff on public.cab_approvals;
create policy cab_approvals_staff on public.cab_approvals
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.cab_approvals to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.cab_approvals;
  exception when duplicate_object then
    null;
  end;
end $$;
