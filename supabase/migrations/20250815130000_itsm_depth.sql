-- Wave 1 ITSM depth: Problem RCA, resolved_at (MTTR), AI summary, knowledge lite.

alter table public.tickets
  add column if not exists problem_id uuid references public.tickets(id) on delete set null,
  add column if not exists workaround text,
  add column if not exists known_error boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists ai_summary text,
  add column if not exists ai_summary_at timestamptz;

create index if not exists idx_tickets_problem
  on public.tickets (tenant_id, problem_id)
  where problem_id is not null;

update public.tickets
set resolved_at = coalesce(resolved_at, updated_at, created_at)
where status in ('resolved', 'closed')
  and resolved_at is null;

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  category text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_knowledge_tenant_published
  on public.knowledge_articles (tenant_id, is_published, updated_at desc);

drop trigger if exists knowledge_articles_updated_at on public.knowledge_articles;
create trigger knowledge_articles_updated_at
before update on public.knowledge_articles
for each row execute function public.set_updated_at();

alter table public.knowledge_articles enable row level security;

drop policy if exists knowledge_articles_select on public.knowledge_articles;
create policy knowledge_articles_select on public.knowledge_articles
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_staff() or is_published = true)
);

drop policy if exists knowledge_articles_write on public.knowledge_articles;
create policy knowledge_articles_write on public.knowledge_articles
for all using (
  tenant_id = public.current_tenant_id() and public.is_staff()
) with check (
  tenant_id = public.current_tenant_id() and public.is_staff()
);

grant select, insert, update, delete on public.knowledge_articles to anon, authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.knowledge_articles;
  exception when duplicate_object then
    null;
  end;
end $$;
