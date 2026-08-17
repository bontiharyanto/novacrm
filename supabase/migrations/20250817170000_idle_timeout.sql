-- Idle session timeout for desk + portal. 0 = off. Default 30 minutes.

alter table public.tenants
  add column if not exists idle_timeout_minutes integer not null default 30;

alter table public.tenants
  drop constraint if exists tenants_idle_timeout_minutes_check;

alter table public.tenants
  add constraint tenants_idle_timeout_minutes_check
  check (idle_timeout_minutes in (0, 15, 30, 60));
