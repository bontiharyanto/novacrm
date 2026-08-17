-- Tenant administration: contract end, grace, auto-pause, protected flag.
-- Replaces hardcoded lab-lock and fixed 30-day assumptions for workspace access.

alter table public.tenants
  add column if not exists is_protected boolean not null default false;

alter table public.tenants
  add column if not exists subscription_plan text not null default 'standard';

alter table public.tenants
  drop constraint if exists tenants_subscription_plan_check;

alter table public.tenants
  add constraint tenants_subscription_plan_check
  check (subscription_plan in ('trial', 'standard', 'enterprise'));

alter table public.tenants
  add column if not exists expires_at timestamptz;

alter table public.tenants
  add column if not exists grace_days integer not null default 7;

alter table public.tenants
  drop constraint if exists tenants_grace_days_check;

alter table public.tenants
  add constraint tenants_grace_days_check
  check (grace_days between 0 and 90);

alter table public.tenants
  add column if not exists auto_pause_on_expiry boolean not null default true;

update public.tenants
set is_protected = true,
    subscription_plan = 'enterprise'
where slug = 'novacrm-demo' or id = '11111111-1111-1111-1111-111111111111';

comment on column public.tenants.is_protected is
  'Protected tenants cannot be paused or auto-expired. Set in Tenant administration, not in code.';
comment on column public.tenants.expires_at is
  'Contract end. Null means no expiry. Login blocks after expires_at + grace_days unless protected.';
