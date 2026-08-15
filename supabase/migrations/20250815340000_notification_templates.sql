-- Per-tenant notification copy. Empty keys fall back to i18n defaults.
-- Write: tenant admin / superadmin only. Worker reads via service role.

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  locale text not null check (locale in ('id', 'en')),
  templates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenant_id, locale)
);

create index if not exists idx_notification_templates_tenant
  on public.notification_templates (tenant_id, locale);

drop trigger if exists notification_templates_updated_at on public.notification_templates;
create trigger notification_templates_updated_at
before update on public.notification_templates
for each row execute function public.set_updated_at();

alter table public.notification_templates enable row level security;

drop policy if exists notification_templates_admin on public.notification_templates;
create policy notification_templates_admin on public.notification_templates
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
);

grant select, insert, update, delete on public.notification_templates to authenticated, service_role;

notify pgrst, 'reload schema';
