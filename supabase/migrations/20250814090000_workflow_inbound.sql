-- Workflow complexity (condition nodes + extra events/actions) and inbound event log.

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'workflow_rules'
      and c.contype = 'c'
  loop
    execute format('alter table public.workflow_rules drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.workflow_rules
  add constraint workflow_rules_event_check
  check (event in (
    'ticket.create',
    'ticket.status_change',
    'ticket.comment_add',
    'alert.received',
    'inbound.message'
  ));

alter table public.workflow_rules
  add constraint workflow_rules_action_check
  check (action in (
    'send_email',
    'assign',
    'change_status',
    'create_asset',
    'create_ticket',
    'send_whatsapp',
    'send_telegram'
  ));

create table if not exists public.inbound_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'telegram', 'email', 'alert', 'generic')),
  fingerprint text,
  sender text,
  subject text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'created' check (status in ('created', 'correlated', 'ignored')),
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_inbound_events_fp
  on public.inbound_events (tenant_id, fingerprint, created_at desc);

create index if not exists idx_inbound_events_ticket
  on public.inbound_events (ticket_id, created_at desc);

alter table public.inbound_events enable row level security;

drop policy if exists inbound_events_select on public.inbound_events;
create policy inbound_events_select on public.inbound_events
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

drop policy if exists inbound_events_write on public.inbound_events;
create policy inbound_events_write on public.inbound_events
for all using (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
) with check (
  tenant_id = public.current_tenant_id()
  and public.current_app_role() in ('admin', 'agent')
);

grant select, insert, update, delete on public.inbound_events to anon, authenticated, service_role;

do $$
begin
  alter publication supabase_realtime add table public.inbound_events;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
