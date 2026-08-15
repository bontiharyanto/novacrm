-- Lean staff performance reviews (not HRIS). Snapshot is ticket metrics, not the score.

create table if not exists public.staff_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subject_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  quality smallint not null check (quality between 1 and 5),
  sla_discipline smallint not null check (sla_discipline between 1 and 5),
  teamwork smallint not null check (teamwork between 1 and 5),
  ownership smallint not null check (ownership between 1 and 5),
  comment text,
  strengths text,
  improvements text,
  snapshot jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'acknowledged')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint staff_reviews_period_ok check (period_end >= period_start),
  constraint staff_reviews_not_self check (subject_id <> reviewer_id),
  unique (tenant_id, subject_id, period_start, period_end)
);

create index if not exists idx_staff_reviews_tenant_subject
  on public.staff_reviews (tenant_id, subject_id, period_end desc);

create index if not exists idx_staff_reviews_reviewer
  on public.staff_reviews (tenant_id, reviewer_id, created_at desc);

drop trigger if exists staff_reviews_updated_at on public.staff_reviews;
create trigger staff_reviews_updated_at
before update on public.staff_reviews
for each row execute function public.set_updated_at();

create or replace function public.staff_reviews_guard_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_supervisor_role() then
    return new;
  end if;

  if public.is_team_lead_role()
     and old.status = 'draft'
     and old.reviewer_id = auth.uid() then
    if new.subject_id is distinct from old.subject_id
       or new.reviewer_id is distinct from old.reviewer_id
       or new.tenant_id is distinct from old.tenant_id then
      raise exception 'cannot reassign review';
    end if;
    return new;
  end if;

  if old.subject_id = auth.uid() and old.status = 'submitted' then
    new.id := old.id;
    new.tenant_id := old.tenant_id;
    new.subject_id := old.subject_id;
    new.reviewer_id := old.reviewer_id;
    new.period_start := old.period_start;
    new.period_end := old.period_end;
    new.quality := old.quality;
    new.sla_discipline := old.sla_discipline;
    new.teamwork := old.teamwork;
    new.ownership := old.ownership;
    new.comment := old.comment;
    new.strengths := old.strengths;
    new.improvements := old.improvements;
    new.snapshot := old.snapshot;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.status := 'acknowledged';
    new.acknowledged_at := coalesce(new.acknowledged_at, now());
    return new;
  end if;

  raise exception 'not allowed to update this review';
end;
$$;

drop trigger if exists staff_reviews_guard_update on public.staff_reviews;
create trigger staff_reviews_guard_update
before update on public.staff_reviews
for each row execute function public.staff_reviews_guard_update();

alter table public.staff_reviews enable row level security;

drop policy if exists staff_reviews_select on public.staff_reviews;
create policy staff_reviews_select on public.staff_reviews
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
  and (
    public.is_team_lead_role()
    or (subject_id = auth.uid() and status <> 'draft')
  )
);

drop policy if exists staff_reviews_insert on public.staff_reviews;
create policy staff_reviews_insert on public.staff_reviews
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_team_lead_role()
  and reviewer_id = auth.uid()
  and subject_id <> auth.uid()
);

drop policy if exists staff_reviews_update on public.staff_reviews;
create policy staff_reviews_update on public.staff_reviews
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_supervisor_role()
    or (
      public.is_team_lead_role()
      and reviewer_id = auth.uid()
      and status = 'draft'
    )
    or (subject_id = auth.uid() and status = 'submitted')
  )
)
with check (
  tenant_id = public.current_tenant_id()
  and (
    public.is_supervisor_role()
    or (
      public.is_team_lead_role()
      and reviewer_id = auth.uid()
    )
    or (subject_id = auth.uid() and status = 'acknowledged')
  )
);

grant select, insert, update on public.staff_reviews to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.staff_reviews;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Lab: SPV reviews Sari L1 for the previous calendar month.
insert into public.staff_reviews (
  id,
  tenant_id,
  subject_id,
  reviewer_id,
  period_start,
  period_end,
  quality,
  sla_discipline,
  teamwork,
  ownership,
  comment,
  strengths,
  improvements,
  snapshot,
  status,
  created_by
)
select
  'a1111111-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  sari.id,
  spv.id,
  (date_trunc('month', current_date) - interval '1 month')::date,
  (date_trunc('month', current_date) - interval '1 day')::date,
  4,
  3,
  4,
  4,
  'Mutu tiket stabil. Disiplin SLA perlu lebih ketat pada hold vendor.',
  'Komunikasi ke requester jelas. Eskalasi L2 tepat waktu.',
  'Catat nomor kasus vendor sebelum hold. Tutup tiket di hari yang sama jika sudah resolved.',
  jsonb_build_object(
    'ticketsClosed', 4,
    'csatAvg', 4.2,
    'csatCount', 3,
    'slaBreaches', 1
  ),
  'submitted',
  spv.id
from public.profiles sari
join public.profiles spv
  on spv.email = 'spv@novacrm.app'
 and spv.tenant_id = '11111111-1111-1111-1111-111111111111'
where sari.email = 'sari.l1@novacrm.app'
  and sari.tenant_id = '11111111-1111-1111-1111-111111111111'
  and not exists (
    select 1 from public.staff_reviews r
    where r.id = 'a1111111-0001-0001-0001-000000000001'
  );
