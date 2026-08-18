-- Shift swap requests: agent proposes, counterpart accepts, supervisor applies atomically.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wfm_swap_status') then
    create type public.wfm_swap_status as enum (
      'pending_peer',
      'pending_lead',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end $$;

create table if not exists public.wfm_shift_swaps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  counterpart_id uuid not null references public.profiles(id) on delete cascade,
  requester_date date not null,
  counterpart_date date not null,
  requester_entry_id uuid not null references public.wfm_roster_entries(id) on delete restrict,
  counterpart_entry_id uuid not null references public.wfm_roster_entries(id) on delete restrict,
  requester_template_id uuid not null references public.wfm_shift_templates(id) on delete restrict,
  counterpart_template_id uuid not null references public.wfm_shift_templates(id) on delete restrict,
  status public.wfm_swap_status not null default 'pending_peer',
  note text,
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  check (requester_id <> counterpart_id),
  check (requester_entry_id <> counterpart_entry_id)
);

create index if not exists idx_wfm_swaps_tenant_status
  on public.wfm_shift_swaps (tenant_id, status, created_at desc);
create index if not exists idx_wfm_swaps_requester
  on public.wfm_shift_swaps (tenant_id, requester_id, created_at desc);
create index if not exists idx_wfm_swaps_counterpart
  on public.wfm_shift_swaps (tenant_id, counterpart_id, created_at desc);

create unique index if not exists idx_wfm_swaps_open_requester_entry
  on public.wfm_shift_swaps (requester_entry_id)
  where status in ('pending_peer', 'pending_lead');
create unique index if not exists idx_wfm_swaps_open_counterpart_entry
  on public.wfm_shift_swaps (counterpart_entry_id)
  where status in ('pending_peer', 'pending_lead');

create table if not exists public.wfm_shift_swap_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  swap_id uuid not null references public.wfm_shift_swaps(id) on delete cascade,
  action text not null,
  from_status public.wfm_swap_status,
  to_status public.wfm_swap_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_wfm_swap_events_swap
  on public.wfm_shift_swap_events (swap_id, created_at);

drop trigger if exists wfm_shift_swaps_updated_at on public.wfm_shift_swaps;
create trigger wfm_shift_swaps_updated_at before update on public.wfm_shift_swaps
for each row execute function public.set_updated_at();

alter table public.wfm_shift_swaps enable row level security;
alter table public.wfm_shift_swap_events enable row level security;

drop policy if exists wfm_swaps_select on public.wfm_shift_swaps;
create policy wfm_swaps_select on public.wfm_shift_swaps
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and (
    public.is_supervisor_role()
    or requester_id = auth.uid()
    or counterpart_id = auth.uid()
  )
);

drop policy if exists wfm_swaps_insert on public.wfm_shift_swaps;
create policy wfm_swaps_insert on public.wfm_shift_swaps
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and requester_id = auth.uid()
);

drop policy if exists wfm_swaps_update on public.wfm_shift_swaps;
create policy wfm_swaps_update on public.wfm_shift_swaps
for update using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and (
    public.is_supervisor_role()
    or requester_id = auth.uid()
    or counterpart_id = auth.uid()
  )
) with check (
  tenant_id = public.current_tenant_id()
);

drop policy if exists wfm_swap_events_select on public.wfm_shift_swap_events;
create policy wfm_swap_events_select on public.wfm_shift_swap_events
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and exists (
    select 1 from public.wfm_shift_swaps s
    where s.id = swap_id
      and (
        public.is_supervisor_role()
        or s.requester_id = auth.uid()
        or s.counterpart_id = auth.uid()
      )
  )
);

drop policy if exists wfm_swap_events_insert on public.wfm_shift_swap_events;
create policy wfm_swap_events_insert on public.wfm_shift_swap_events
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert, update on public.wfm_shift_swaps to authenticated, service_role;
grant select, insert on public.wfm_shift_swap_events to authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.wfm_shift_swaps;
exception when duplicate_object then null;
end $$;

create or replace function public.apply_wfm_shift_swap(p_swap_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.wfm_shift_swaps%rowtype;
  a public.wfm_roster_entries%rowtype;
  b public.wfm_roster_entries%rowtype;
  template_a uuid;
  template_b uuid;
begin
  if auth.uid() is distinct from p_actor or not public.is_supervisor_role() then
    raise exception 'Unauthorized';
  end if;

  select * into s from public.wfm_shift_swaps where id = p_swap_id for update;
  if not found then
    raise exception 'Swap not found';
  end if;
  if s.tenant_id is distinct from public.current_tenant_id() then
    raise exception 'Unauthorized';
  end if;
  if s.status <> 'pending_lead' then
    raise exception 'Swap is not waiting for approval';
  end if;

  select * into a from public.wfm_roster_entries where id = s.requester_entry_id for update;
  select * into b from public.wfm_roster_entries where id = s.counterpart_entry_id for update;
  if a.id is null or b.id is null then
    raise exception 'Roster cell is missing';
  end if;
  if a.tenant_id <> s.tenant_id or b.tenant_id <> s.tenant_id then
    raise exception 'Tenant mismatch';
  end if;
  if a.user_id <> s.requester_id or a.work_date <> s.requester_date or a.group_id <> s.group_id then
    raise exception 'Requester shift has changed';
  end if;
  if b.user_id <> s.counterpart_id or b.work_date <> s.counterpart_date or b.group_id <> s.group_id then
    raise exception 'Counterpart shift has changed';
  end if;

  template_a := a.template_id;
  template_b := b.template_id;

  if s.requester_date = s.counterpart_date then
    update public.wfm_roster_entries
      set template_id = template_b, source = 'override'
      where id = a.id;
    update public.wfm_roster_entries
      set template_id = template_a, source = 'override'
      where id = b.id;
  else
    if exists (
      select 1 from public.wfm_roster_entries e
      where e.user_id = s.counterpart_id
        and e.group_id = s.group_id
        and e.work_date = s.requester_date
        and e.id <> a.id
    ) then
      raise exception 'Counterpart already has a shift on the requester date';
    end if;
    if exists (
      select 1 from public.wfm_roster_entries e
      where e.user_id = s.requester_id
        and e.group_id = s.group_id
        and e.work_date = s.counterpart_date
        and e.id <> b.id
    ) then
      raise exception 'Requester already has a shift on the counterpart date';
    end if;
    update public.wfm_roster_entries
      set user_id = s.counterpart_id, source = 'override'
      where id = a.id;
    update public.wfm_roster_entries
      set user_id = s.requester_id, source = 'override'
      where id = b.id;
  end if;

  update public.wfm_shift_swaps
    set status = 'approved',
        applied_at = now(),
        decided_by = p_actor,
        decided_at = now()
    where id = p_swap_id;
end;
$$;

grant execute on function public.apply_wfm_shift_swap(uuid, uuid) to authenticated, service_role;
