-- Portal user site/branch for major-incident impact targeting.

alter table public.profiles
  add column if not exists site text;

comment on column public.profiles.site is
  'Default site or branch for portal customers (e.g. Jakarta HQ, Cabang Senayan). Used for GAMAS impact detection.';
