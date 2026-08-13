-- Per-tenant integration catalog (AI + inbound webhook secrets) and connection-test audit.

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  kind text not null check (kind in ('ai', 'webhook')),
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_tested_at timestamptz,
  last_ok boolean,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, kind)
);

create index if not exists idx_integrations_tenant on public.integrations (tenant_id, kind);

drop trigger if exists integrations_updated_at on public.integrations;
create trigger integrations_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

alter table public.notification_channels
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_ok boolean,
  add column if not exists last_error text;

alter table public.integrations enable row level security;

drop policy if exists integrations_admin on public.integrations;
create policy integrations_admin on public.integrations
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() = 'admin'
);

grant select, insert, update, delete on public.integrations to anon, authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.integrations;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

insert into public.integrations (tenant_id, kind, config, is_active, created_by)
values (
  '11111111-1111-1111-1111-111111111111',
  'ai',
  '{"baseUrl":"https://api.groq.com/openai/v1","model":"llama-3.1-8b-instant"}'::jsonb,
  true,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (tenant_id, kind) do update
set config = public.integrations.config || excluded.config
where coalesce(public.integrations.config->>'apiKey', '') = '';

