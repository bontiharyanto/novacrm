create type public.notification_channel_type as enum ('whatsapp', 'telegram', 'email');

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  type public.notification_channel_type not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'queued',
  ticket_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_channels_tenant_id
  on public.notification_channels (tenant_id);

create index if not exists idx_notification_channels_active
  on public.notification_channels (tenant_id, is_active, type);

create index if not exists idx_notification_logs_tenant_id
  on public.notification_logs (tenant_id, created_at desc);

create index if not exists idx_notification_logs_ticket_id
  on public.notification_logs (ticket_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notification_channels_updated_at
before update on public.notification_channels
for each row
execute function public.set_updated_at();

alter table public.notification_channels enable row level security;
alter table public.notification_logs enable row level security;

create policy "notification_channels_tenant_isolation"
on public.notification_channels
for all
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "notification_logs_tenant_isolation"
on public.notification_logs
for all
using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

comment on table public.notification_channels is 'Stores enabled outbound channels for a tenant.';
comment on table public.notification_logs is 'Audit trail for outbound notifications and delivery attempts.';
