-- NovaCRM seed: 1 tenant, 3 users, 10 assets, 10 CMDB items, 20 tickets

insert into public.tenants (id, name, slug, accent_color, timezone, support_email, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'NovaCRM Demo Tenant',
  'novacrm-demo',
  '#3b82f6',
  'Asia/Jakarta',
  'support@novacrm.app',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  support_email = excluded.support_email;

do $$
declare
  admin_id uuid := '22222222-2222-2222-2222-222222222222';
  agent_id uuid := '33333333-3333-3333-3333-333333333333';
  customer_id uuid := '44444444-4444-4444-4444-444444444444';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
     'admin@novacrm.app', extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Nova Admin","role":"admin","tenant_id":"11111111-1111-1111-1111-111111111111"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', agent_id, 'authenticated', 'authenticated',
     'agent@novacrm.app', extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Nova Agent","role":"agent","tenant_id":"11111111-1111-1111-1111-111111111111"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', customer_id, 'authenticated', 'authenticated',
     'customer@novacrm.app', extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Nova Customer","role":"customer","tenant_id":"11111111-1111-1111-1111-111111111111"}',
     now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"admin@novacrm.app"}', admin_id)::jsonb, 'email', admin_id::text, now(), now(), now()),
    (gen_random_uuid(), agent_id, format('{"sub":"%s","email":"agent@novacrm.app"}', agent_id)::jsonb, 'email', agent_id::text, now(), now(), now()),
    (gen_random_uuid(), customer_id, format('{"sub":"%s","email":"customer@novacrm.app"}', customer_id)::jsonb, 'email', customer_id::text, now(), now(), now())
  on conflict do nothing;

  insert into public.profiles (id, tenant_id, role, full_name, email, phone, created_by)
  values
    (admin_id, '11111111-1111-1111-1111-111111111111', 'admin', 'Nova Admin', 'admin@novacrm.app', '628111000001', admin_id),
    (agent_id, '11111111-1111-1111-1111-111111111111', 'agent', 'Nova Agent', 'agent@novacrm.app', '628111000002', admin_id),
    (customer_id, '11111111-1111-1111-1111-111111111111', 'customer', 'Nova Customer', 'customer@novacrm.app', '628111000003', admin_id)
  on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
exception when others then
  raise notice 'Skipping auth.users seed (%). Create users in Supabase Auth, then re-run profile seed.', SQLERRM;
end $$;

insert into public.assets (id, tenant_id, name, asset_tag, type, brand, model, status, location, assigned_to, created_by)
values
  ('aaaaaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Laptop Finance 01', 'AST-1001', 'laptop', 'Lenovo', 'ThinkPad T14', 'active', 'Jakarta HQ', 'Finance', null),
  ('aaaaaaaa-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Laptop Ops 02', 'AST-1002', 'laptop', 'Dell', 'Latitude 5440', 'active', 'Jakarta HQ', 'Operations', null),
  ('aaaaaaaa-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'App Server 01', 'AST-2001', 'server', 'Dell', 'PowerEdge R740', 'active', 'DC-1', 'Infra', null),
  ('aaaaaaaa-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'DB Server 01', 'AST-2002', 'server', 'HP', 'ProLiant DL380', 'active', 'DC-1', 'Infra', null),
  ('aaaaaaaa-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Core Switch', 'AST-3001', 'network', 'Cisco', 'C9300', 'active', 'DC-1', 'Network', null),
  ('aaaaaaaa-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Firewall Edge', 'AST-3002', 'network', 'Fortinet', 'FortiGate 200F', 'active', 'DC-1', 'Network', null),
  ('aaaaaaaa-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Printer Marketing', 'AST-4001', 'printer', 'HP', 'LaserJet MFP', 'in_repair', 'Lt. 3', 'Marketing', null),
  ('aaaaaaaa-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Printer Warehouse', 'AST-4002', 'printer', 'Epson', 'L6490', 'active', 'Gudang', 'Warehouse', null),
  ('aaaaaaaa-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'Mobile Field 01', 'AST-5001', 'mobile', 'Samsung', 'A55', 'active', 'Field', 'Sales', null),
  ('aaaaaaaa-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'Mobile Field 02', 'AST-5002', 'mobile', 'Samsung', 'A55', 'lost', 'Field', 'Sales', null)
on conflict (id) do nothing;

insert into public.cmdb_items (id, tenant_id, asset_id, name, type, attributes, relations, created_by)
values
  ('bbbbbbbb-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000003', 'prod-app-01', 'server', '{"env":"prod"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000002","type":"depends_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000004', 'prod-db-01', 'database', '{"engine":"postgres"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000005', 'core-sw-01', 'network', '{"role":"core"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"connects"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000006', 'fw-edge-01', 'network', '{"role":"edge"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000003","type":"protects"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', null, 'crm-web', 'service', '{"stack":"nextjs"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"runs_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', null, 'crm-worker', 'service', '{"stack":"bullmq"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"runs_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', null, 'vpn-gateway', 'service', '{"vendor":"fortinet"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000004","type":"hosted_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000007', 'print-mkt', 'printer', '{"floor":"3"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000001', 'laptop-fin-01', 'endpoint', '{"owner":"finance"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000007","type":"uses"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0001-0001-0001-000000000002', 'laptop-ops-02', 'endpoint', '{"owner":"ops"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000005","type":"uses"}]', null)
on conflict (id) do nothing;

insert into public.tickets (
  tenant_id, title, description, status, priority, category, due_date, requester_name, requester_email, asset_id, created_by
)
values
  ('11111111-1111-1111-1111-111111111111', 'Laptop tidak bisa boot', '{"type":"plain","text":"Laptop user blue screen saat mulai."}', 'open', 'high', 'hardware', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000001', null),
  ('11111111-1111-1111-1111-111111111111', 'VPN tidak terhubung', '{"type":"plain","text":"Gagal VPN dari rumah."}', 'in_progress', 'critical', 'network', now() + interval '12 hours', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000006', null),
  ('11111111-1111-1111-1111-111111111111', 'Printer offline', '{"type":"plain","text":"Printer marketing tidak bisa dipakai."}', 'waiting', 'medium', 'printer', now() + interval '2 days', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000007', null),
  ('11111111-1111-1111-1111-111111111111', 'Email tertunda', '{"type":"plain","text":"Inbox tertahan di relay."}', 'open', 'high', 'email', now() + interval '8 hours', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Monitor bergaris', '{"type":"plain","text":"Garis vertikal di monitor QA."}', 'resolved', 'low', 'hardware', now() - interval '1 day', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Aplikasi CRM lag', '{"type":"plain","text":"CRM lambat saat jam kerja."}', 'in_progress', 'high', 'application', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000003', null),
  ('11111111-1111-1111-1111-111111111111', 'Password tidak bisa reset', '{"type":"plain","text":"Email reset tidak diterima."}', 'waiting', 'medium', 'identity', now() + interval '3 days', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Server database warning', '{"type":"plain","text":"CPU DB di atas threshold."}', 'open', 'critical', 'infrastructure', now() + interval '6 hours', 'Nova Agent', 'agent@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000004', null),
  ('11111111-1111-1111-1111-111111111111', 'User baru butuh akun', '{"type":"plain","text":"Akses Gmail dan Slack untuk sales baru."}', 'closed', 'low', 'access', now() - interval '3 days', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Scanner gagal baca barcode', '{"type":"plain","text":"Scanner gudang tidak baca label baru."}', 'open', 'medium', 'scanner', now() + interval '2 days', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'WiFi lantai 2 putus', '{"type":"plain","text":"SSID lantai 2 sering disconnect."}', 'hold', 'high', 'network', now() + interval '10 hours', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000005', null),
  ('11111111-1111-1111-1111-111111111111', 'Lisensi Office habis', '{"type":"plain","text":"Aktivasi Office gagal."}', 'open', 'medium', 'license', now() + interval '4 days', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000002', null),
  ('11111111-1111-1111-1111-111111111111', 'Backup gagal semalam', '{"type":"plain","text":"Job pg_dump exit 1."}', 'in_progress', 'critical', 'infrastructure', now() + interval '4 hours', 'Nova Agent', 'agent@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000004', null),
  ('11111111-1111-1111-1111-111111111111', 'Akses GitHub hilang', '{"type":"plain","text":"SSO GitHub menolak user."}', 'waiting', 'high', 'identity', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'AC ruang server panas', '{"type":"plain","text":"Suhu DC-1 29C."}', 'open', 'critical', 'facilities', now() + interval '3 hours', 'Nova Agent', 'agent@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Request laptop baru', '{"type":"plain","text":"Karyawan baru butuh laptop."}', 'hold', 'low', 'request', now() + interval '5 days', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Phishing email masuk', '{"type":"plain","text":"Beberapa user klik lampiran mencurigakan."}', 'in_progress', 'critical', 'security', now() + interval '2 hours', 'Nova Admin', 'admin@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Aplikasi absensi error', '{"type":"plain","text":"Check-in gagal 500."}', 'open', 'high', 'application', now() + interval '9 hours', 'Nova Customer', 'customer@novacrm.app', null, null),
  ('11111111-1111-1111-1111-111111111111', 'Kabel LAN putus', '{"type":"plain","text":"Port 24 di lantai 1 mati."}', 'resolved', 'medium', 'network', now() - interval '2 days', 'Nova Customer', 'customer@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000005', null),
  ('11111111-1111-1111-1111-111111111111', 'Update Windows tertahan', '{"type":"plain","text":"WSUS tidak push patch."}', 'closed', 'low', 'endpoint', now() - interval '4 days', 'Nova Agent', 'agent@novacrm.app', 'aaaaaaaa-0001-0001-0001-000000000002', null);

insert into public.notification_channels (tenant_id, type, config, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'whatsapp', '{"target":"6281234567890"}', true),
  ('11111111-1111-1111-1111-111111111111', 'telegram', '{"chatId":"-1001234567890"}', true),
  ('11111111-1111-1111-1111-111111111111', 'email', '{"from":"NovaCRM <no-reply@novacrm.app>"}', true)
on conflict (tenant_id, type) do nothing;

insert into public.workflow_rules (tenant_id, name, event, action, target, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Auto acknowledge new ticket', 'ticket.create', 'send_email', 'requester', true),
  ('11111111-1111-1111-1111-111111111111', 'Escalate high priority', 'ticket.status_change', 'assign', 'ops-team', true)
on conflict do nothing;

insert into public.notification_logs (tenant_id, channel, recipient, subject, body, status)
values
  ('11111111-1111-1111-1111-111111111111', 'whatsapp', '6281234567890', 'Ticket baru dibuat', 'Halo, tiket baru telah dibuat.', 'sent'),
  ('11111111-1111-1111-1111-111111111111', 'telegram', '-1001234567890', 'Update status', 'Ada update status tiket baru.', 'sent'),
  ('11111111-1111-1111-1111-111111111111', 'email', 'customer@example.com', 'Ticket dibuat', 'Ticket Anda telah dibuat.', 'sent');
