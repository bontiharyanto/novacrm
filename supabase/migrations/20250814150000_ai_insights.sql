-- Tenant-scoped AI insight runs. Staff can read/insert; no PII in payload by contract.

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete set null,
  kind text not null check (kind in ('queue_pressure', 'sla_risk', 'workforce_load', 'account_health')),
  title text not null,
  summary text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'danger')),
  source text not null default 'snapshot' check (source in ('ai', 'snapshot')),
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  latency_ms int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_ai_insights_latest
  on public.ai_insights (tenant_id, account_id, kind, created_at desc);

drop trigger if exists ai_insights_updated_at on public.ai_insights;
create trigger ai_insights_updated_at
before update on public.ai_insights
for each row execute function public.set_updated_at();

alter table public.ai_insights enable row level security;

drop policy if exists ai_insights_staff on public.ai_insights;
create policy ai_insights_staff on public.ai_insights
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_staff()
);

grant select, insert, update, delete on public.ai_insights to anon, authenticated, service_role;

notify pgrst, 'reload schema';
