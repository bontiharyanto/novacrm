-- Password rotation: portal + operations. Default 30 days. Admin can reset.

alter table public.tenants
  add column if not exists password_rotation_enabled boolean not null default true;

alter table public.tenants
  add column if not exists password_max_age_days integer not null default 30;

alter table public.tenants
  drop constraint if exists tenants_password_max_age_days_check;

alter table public.tenants
  add constraint tenants_password_max_age_days_check
  check (password_max_age_days between 7 and 365);

alter table public.profiles
  add column if not exists password_changed_at timestamptz not null default now();

update public.profiles
set password_changed_at = coalesce(password_changed_at, now())
where password_changed_at is null;
