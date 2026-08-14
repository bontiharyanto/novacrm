-- Plugin catalog (global + tenant-custom). Cards on Integrasi are rendered from this table.

create table if not exists public.integration_plugins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z][a-z0-9_]{1,40}$'),
  label text not null,
  hint text not null default '',
  category text not null default 'other' check (category in ('builtin', 'chat', 'itsm', 'crm', 'other')),
  ui_variant text not null default 'fields' check (ui_variant in ('ai', 'webhook', 'fields')),
  fields jsonb not null default '[]'::jsonb,
  help_test text not null default '',
  help_after text not null default '',
  test_spec jsonb not null default '{"kind":"save"}'::jsonb,
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists idx_integration_plugins_global_slug
  on public.integration_plugins (slug)
  where tenant_id is null;

create unique index if not exists idx_integration_plugins_tenant_slug
  on public.integration_plugins (tenant_id, slug)
  where tenant_id is not null;

create index if not exists idx_integration_plugins_list
  on public.integration_plugins (tenant_id, sort_order, label);

drop trigger if exists integration_plugins_updated_at on public.integration_plugins;
create trigger integration_plugins_updated_at
before update on public.integration_plugins
for each row execute function public.set_updated_at();

alter table public.integration_plugins enable row level security;

drop policy if exists integration_plugins_read on public.integration_plugins;
create policy integration_plugins_read on public.integration_plugins
for select using (
  is_active = true
  and (tenant_id is null or tenant_id = public.current_tenant_id())
  and public.is_staff()
);

drop policy if exists integration_plugins_write on public.integration_plugins;
create policy integration_plugins_write on public.integration_plugins
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
) with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_admin()
);

grant select, insert, update, delete on public.integration_plugins to anon, authenticated, service_role;

alter table public.integrations drop constraint if exists integrations_kind_check;
alter table public.integrations
  add constraint integrations_kind_check check (kind ~ '^[a-z][a-z0-9_]{1,40}$');

insert into public.integration_plugins (
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
select * from (
  values
  (
    null::uuid,
    'ai',
    'AI',
    'Groq free / Gemini / Ollama',
    'builtin',
    'ai',
    '[]'::jsonb,
    'Default is Groq (free). Use a gsk_ key from console.groq.com. Model must be a Groq model, not OpenAI gpt-4o-mini.',
    'Open Assistant and AI Insights. Both read live desk signals for the active account filter.',
    '{"kind":"builtin"}'::jsonb,
    10,
    true
  ),
  (
    null,
    'telegram',
    'Telegram',
    'Bot API',
    'chat',
    'fields',
    '[{"key":"botToken","label":"Bot token","type":"password","secret":true,"required":true},{"key":"chatId","label":"Chat ID","type":"text","placeholder":"-100..."}]'::jsonb,
    'Runs getMe on the bot token. If Chat ID is set, also sends a test message.',
    'Ticket events can notify this chat when the channel is active.',
    '{"kind":"builtin"}'::jsonb,
    20,
    true
  ),
  (
    null,
    'whatsapp',
    'WhatsApp',
    'Fonnte / Wabot',
    'chat',
    'fields',
    '[{"key":"apiKey","label":"API key","type":"password","secret":true,"required":true,"placeholder":"Fonnte token"}]'::jsonb,
    'Sends a test to the admin phone on the profile, or a placeholder if empty.',
    'Inbound WhatsApp can open a ticket when the webhook is configured.',
    '{"kind":"builtin"}'::jsonb,
    30,
    true
  ),
  (
    null,
    'email',
    'Email',
    'Resend or Mailpit',
    'builtin',
    'fields',
    '[{"key":"apiKey","label":"API key (Resend)","type":"password","secret":true,"placeholder":"Optional on laptop — Mailpit is used"},{"key":"from","label":"From","type":"text"}]'::jsonb,
    'Sends to your login email. On this laptop that lands in Mailpit.',
    'SLA and ticket notifications use this channel when it is active.',
    '{"kind":"builtin"}'::jsonb,
    40,
    true
  ),
  (
    null,
    'slack',
    'Slack',
    'Bot token · chat.nova',
    'chat',
    'fields',
    '[{"key":"botToken","label":"Bot token","type":"password","secret":true,"required":true,"placeholder":"xoxb-..."},{"key":"channelId","label":"Default channel ID","type":"text","placeholder":"C0..."}]'::jsonb,
    'Calls Slack auth.test with the bot token. Channel ID is optional until you send alerts.',
    'Use the bot token from api.slack.com/apps. Invite the bot to the channel before sending.',
    '{"kind":"http","url":"https://slack.com/api/auth.test","method":"POST","auth":{"type":"bearer","tokenField":"botToken"}}'::jsonb,
    50,
    true
  ),
  (
    null,
    'jira',
    'Jira',
    'Cloud REST · issues',
    'itsm',
    'fields',
    '[{"key":"baseUrl","label":"Site URL","type":"url","required":true,"placeholder":"https://your-domain.atlassian.net"},{"key":"email","label":"Email","type":"text","required":true},{"key":"apiToken","label":"API token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls /rest/api/3/myself with basic auth (email + API token from id.atlassian.com).',
    'Map NovaCRM tickets to Jira issues from workflow actions after the connection tests OK.',
    '{"kind":"http","url":"{{baseUrl}}/rest/api/3/myself","method":"GET","auth":{"type":"basic","userField":"email","passField":"apiToken"}}'::jsonb,
    60,
    true
  ),
  (
    null,
    'salesforce',
    'Salesforce',
    'REST · accounts & cases',
    'crm',
    'fields',
    '[{"key":"instanceUrl","label":"Instance URL","type":"url","required":true,"placeholder":"https://yourorg.my.salesforce.com"},{"key":"clientId","label":"Consumer key","type":"text","required":true},{"key":"clientSecret","label":"Consumer secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls /services/data/v59.0/ with the access token. Connected App supplies consumer key/secret.',
    'Use this to link customer accounts and cases. Refresh-token flow can replace the access token later.',
    '{"kind":"http","url":"{{instanceUrl}}/services/data/v59.0/","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    70,
    true
  ),
  (
    null,
    'webhook',
    'Other',
    'Alert / email / generic inbound',
    'other',
    'webhook',
    '[{"key":"alertSecret","label":"Alert secret","type":"password","secret":true},{"key":"emailSecret","label":"Email inbound secret","type":"password","secret":true},{"key":"genericSecret","label":"Generic secret","type":"password","secret":true}]'::jsonb,
    'Stores secrets used by inbound routes. Env secrets still work as fallback.',
    'POST to the inbound URLs with the matching secret header.',
    '{"kind":"builtin"}'::jsonb,
    90,
    true
  )
) as seed(
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
where not exists (
  select 1 from public.integration_plugins existing
  where existing.slug = seed.slug and existing.tenant_id is null
);

notify pgrst, 'reload schema';
