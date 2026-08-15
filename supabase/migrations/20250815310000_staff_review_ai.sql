-- Advisory AI scores on staff reviews. Human scores stay official.

alter table public.staff_reviews
  add column if not exists ai_assessment jsonb;

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
    new.ai_assessment := old.ai_assessment;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.status := 'acknowledged';
    new.acknowledged_at := coalesce(new.acknowledged_at, now());
    return new;
  end if;

  raise exception 'not allowed to update this review';
end;
$$;

alter table public.staff_reviews disable trigger staff_reviews_guard_update;

update public.staff_reviews
set ai_assessment = jsonb_build_object(
  'quality', 4,
  'slaDiscipline', 3,
  'teamwork', 4,
  'ownership', 4,
  'comment', 'Volume close wajar. Satu breach SLA menahan skor disiplin. CSAT 4.2 mendukung mutu tiket.',
  'strengths', 'Tiket ditutup dengan catatan yang cukup untuk requester.',
  'improvements', 'Kurangi hold tanpa nomor kasus vendor. Tutup di hari yang sama setelah resolve.',
  'source', 'snapshot',
  'model', 'snapshot',
  'generatedAt', now()
)
where id = 'a1111111-0001-0001-0001-000000000001'
  and ai_assessment is null;

alter table public.staff_reviews enable trigger staff_reviews_guard_update;
