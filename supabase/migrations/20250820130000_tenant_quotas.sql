-- Tenant usage quotas (stored caps). Enforcement comes in a later step.
-- Defaults align with docs/PRICING-MATRIX.md (Starter→trial, MSP→standard, Enterprise→enterprise).

alter table public.tenants
  add column if not exists max_accounts integer;

alter table public.tenants
  add column if not exists max_agents integer;

alter table public.tenants
  add column if not exists max_tickets_per_month integer;

update public.tenants
set
  max_accounts = case subscription_plan
    when 'trial' then 1
    when 'enterprise' then 20
    else 5
  end,
  max_agents = case subscription_plan
    when 'trial' then 8
    when 'enterprise' then 40
    else 15
  end,
  max_tickets_per_month = case subscription_plan
    when 'trial' then 800
    when 'enterprise' then 5000
    else 2000
  end
where max_accounts is null
   or max_agents is null
   or max_tickets_per_month is null;

alter table public.tenants
  alter column max_accounts set default 5,
  alter column max_agents set default 15,
  alter column max_tickets_per_month set default 2000;

alter table public.tenants
  alter column max_accounts set not null,
  alter column max_agents set not null,
  alter column max_tickets_per_month set not null;

alter table public.tenants
  drop constraint if exists tenants_max_accounts_check;
alter table public.tenants
  add constraint tenants_max_accounts_check
  check (max_accounts between 1 and 500);

alter table public.tenants
  drop constraint if exists tenants_max_agents_check;
alter table public.tenants
  add constraint tenants_max_agents_check
  check (max_agents between 1 and 2000);

alter table public.tenants
  drop constraint if exists tenants_max_tickets_per_month_check;
alter table public.tenants
  add constraint tenants_max_tickets_per_month_check
  check (max_tickets_per_month between 1 and 500000);

comment on column public.tenants.max_accounts is
  'Soft product cap: max active accounts. Override per tenant; defaults from plan.';
comment on column public.tenants.max_agents is
  'Soft product cap: max desk agents (non-customer). Override per tenant; defaults from plan.';
comment on column public.tenants.max_tickets_per_month is
  'Soft product cap: max tickets created per calendar month. Override per tenant; defaults from plan.';
