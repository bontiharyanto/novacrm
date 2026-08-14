-- Assistant chat history. Staff-only, isolated per tenant and per user.
-- Survives navigation across modules; no browser localStorage.

create table if not exists public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_assistant_threads_user
  on public.assistant_threads (tenant_id, user_id, updated_at desc);

drop trigger if exists assistant_threads_updated_at on public.assistant_threads;
create trigger assistant_threads_updated_at
before update on public.assistant_threads
for each row execute function public.set_updated_at();

alter table public.assistant_threads enable row level security;

drop policy if exists assistant_threads_own on public.assistant_threads;
create policy assistant_threads_own on public.assistant_threads
for all using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.assistant_threads to anon, authenticated, service_role;

notify pgrst, 'reload schema';
