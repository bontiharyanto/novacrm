-- Presence default is offline until the agent clocks in.
-- Attendance punches are an append-only audit trail (UU PDP / operational record).

alter table public.wfm_presence
  alter column status set default 'offline';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wfm_attendance_kind') then
    create type public.wfm_attendance_kind as enum ('clock_in', 'clock_out');
  end if;
end $$;

create table if not exists public.wfm_attendance_punches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.wfm_attendance_kind not null,
  punched_at timestamptz not null default now(),
  status public.wfm_presence_status not null,
  roster_entry_id uuid references public.wfm_roster_entries(id) on delete set null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_wfm_punches_tenant_user_at
  on public.wfm_attendance_punches (tenant_id, user_id, punched_at desc);

alter table public.wfm_attendance_punches enable row level security;

drop policy if exists wfm_punches_select on public.wfm_attendance_punches;
create policy wfm_punches_select on public.wfm_attendance_punches
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and (user_id = auth.uid() or public.is_supervisor_role())
);

drop policy if exists wfm_punches_insert on public.wfm_attendance_punches;
create policy wfm_punches_insert on public.wfm_attendance_punches
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and user_id = auth.uid()
);

grant select, insert on public.wfm_attendance_punches to authenticated, service_role;
