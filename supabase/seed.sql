-- NovaCRM seed: 1 tenant, 3 accounts, 5 users, org/groups, SLA, 10 assets, 12 CMDB items, tickets

-- Delivery sample data is inserted near the end after ticket/task seed data.

insert into public.tenants (id, name, slug, accent_color, timezone, support_email, status, is_protected, subscription_plan)
values (
  '11111111-1111-1111-1111-111111111111',
  'NovaCRM Demo Tenant',
  'novacrm-demo',
  '#3b82f6',
  'Asia/Jakarta',
  'support@novacrm.app',
  'active',
  true,
  'enterprise'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  support_email = excluded.support_email,
  mfa_required = false,
  is_protected = true;

update public.tenants
set public_url = coalesce(nullif(public_url, ''), 'http://localhost:3000')
where id = '11111111-1111-1111-1111-111111111111';

do $$
declare
  admin_id uuid := '22222222-2222-2222-2222-222222222222';
  agent_id uuid := '33333333-3333-3333-3333-333333333333';
  customer_id uuid := '44444444-4444-4444-4444-444444444444';
  pm_delivery_id uuid := '33333333-3333-3333-3333-333333333340';
  dco_id uuid := '33333333-3333-3333-3333-333333333341';
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
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', pm_delivery_id, 'authenticated', 'authenticated',
     'pm.delivery@novacrm.app', extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"PM Delivery","role":"pm_delivery","tenant_id":"11111111-1111-1111-1111-111111111111"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', dco_id, 'authenticated', 'authenticated',
     'dco@novacrm.app', extensions.crypt('NovaCRM!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"DCO Delivery","role":"dco","tenant_id":"11111111-1111-1111-1111-111111111111"}',
     now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"admin@novacrm.app"}', admin_id)::jsonb, 'email', admin_id::text, now(), now(), now()),
    (gen_random_uuid(), agent_id, format('{"sub":"%s","email":"agent@novacrm.app"}', agent_id)::jsonb, 'email', agent_id::text, now(), now(), now()),
    (gen_random_uuid(), customer_id, format('{"sub":"%s","email":"customer@novacrm.app"}', customer_id)::jsonb, 'email', customer_id::text, now(), now(), now()),
    (gen_random_uuid(), pm_delivery_id, format('{"sub":"%s","email":"pm.delivery@novacrm.app"}', pm_delivery_id)::jsonb, 'email', pm_delivery_id::text, now(), now(), now()),
    (gen_random_uuid(), dco_id, format('{"sub":"%s","email":"dco@novacrm.app"}', dco_id)::jsonb, 'email', dco_id::text, now(), now(), now())
  on conflict do nothing;

  insert into public.profiles (id, tenant_id, role, full_name, email, phone, created_by)
  values
    (admin_id, '11111111-1111-1111-1111-111111111111', 'admin', 'Nova Admin', 'admin@novacrm.app', '628111000001', admin_id),
    (agent_id, '11111111-1111-1111-1111-111111111111', 'agent', 'Nova Agent', 'agent@novacrm.app', '628111000002', admin_id),
    (customer_id, '11111111-1111-1111-1111-111111111111', 'customer', 'Nova Customer', 'customer@novacrm.app', '628111000003', admin_id),
    (pm_delivery_id, '11111111-1111-1111-1111-111111111111', 'pm_delivery', 'PM Delivery', 'pm.delivery@novacrm.app', '628111000004', admin_id),
    (dco_id, '11111111-1111-1111-1111-111111111111', 'dco', 'DCO Delivery', 'dco@novacrm.app', '628111000005', admin_id)
  on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, email = excluded.email;
exception when others then
  raise notice 'Skipping auth.users seed (%). Create users in Supabase Auth, then re-run profile seed.', SQLERRM;
end $$;

insert into public.accounts (id, tenant_id, type, name, slug, code, status, created_by)
values
  ('55555555-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'internal', 'Nova Internal', 'internal', 'INT', 'active', '22222222-2222-2222-2222-222222222222'),
  ('55555555-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'customer', 'PT Bank Nusantara', 'bank-nusantara', 'BNK', 'active', '22222222-2222-2222-2222-222222222222'),
  ('55555555-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'customer', 'PT Garuda Logistics', 'garuda-logistics', 'GRD', 'active', '22222222-2222-2222-2222-222222222222')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, code = excluded.code;

insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
values
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'owner', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', '22222222-2222-2222-2222-222222222222', 'owner', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', '44444444-4444-4444-4444-444444444444', 'portal', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', '22222222-2222-2222-2222-222222222222', 'owner', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222224', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', '22222222-2222-2222-2222-222222222224', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', '22222222-2222-2222-2222-222222222224', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222223', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', '22222222-2222-2222-2222-222222222223', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', '22222222-2222-2222-2222-222222222223', 'member', '22222222-2222-2222-2222-222222222222')
on conflict (account_id, user_id) do nothing;

insert into public.org_units (id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_by)
values
  ('88888888-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', null, 'division', 'Divisi Operasi', 'operasi', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('88888888-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', null, 'division', 'Divisi Layanan', 'layanan', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.role_capabilities (tenant_id, role, action, subject, allowed, created_by)
values
  ('11111111-1111-1111-1111-111111111111', 'agent', 'read', 'Ticket', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'customer', 'read', 'Capability', false, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'pm_delivery', 'create', 'DeliveryProject', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'pm_delivery', 'update', 'DeliveryPhase', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'dco', 'create', 'DeliveryWorkOrder', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'dco', 'create', 'DeliveryTask', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'dco', 'create', 'TaskActivity', true, '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'dco', 'create', 'TaskDependency', true, '22222222-2222-2222-2222-222222222222')
on conflict (tenant_id, role, action, subject) do update set allowed = excluded.allowed;
-- Delivery demo: mirrors a closed-won project from an external Work Order CRM.
insert into public.accounts (
  id, tenant_id, type, name, slug, code, status, external_provider, external_id, created_by
)
values (
  '55555555-0001-0001-0001-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'customer',
  'PT Nusantara Delivery',
  'nusantara-delivery',
  'NVD',
  'active',
  'work_order_crm',
  'CRM-ACCOUNT-001',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do update set
  external_provider = excluded.external_provider,
  external_id = excluded.external_id;

insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
values
(
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000004',
  '44444444-4444-4444-4444-444444444444',
  'portal',
  '22222222-2222-2222-2222-222222222222'
),
(
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000004',
  '33333333-3333-3333-3333-333333333340',
  'member',
  '22222222-2222-2222-2222-222222222222'
),
(
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000004',
  '33333333-3333-3333-3333-333333333341',
  'member',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (account_id, user_id) do nothing;

insert into public.delivery_projects (
  id, tenant_id, account_id, external_provider, external_id, name, description, status, pm_id, dco_id,
  planned_start, planned_end, created_by
)
values (
  '77777777-0001-4001-8001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000004',
  'work_order_crm',
  'CRM-PROJECT-001',
  'Implementasi Network Cabang Jakarta',
  'Delivery project dari Work Order Management CRM setelah status Closed Won.',
  'in_progress',
  '33333333-3333-3333-3333-333333333340',
  '33333333-3333-3333-3333-333333333341',
  current_date - 7,
  current_date + 30,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.delivery_phases (
  id, tenant_id, project_id, phase_key, title, status, sort_order, customer_visible, created_by
)
values
  ('77777777-0001-4001-8001-000000000011', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'feasibility', 'Determine customer order feasibility (Survey)', 'completed', 0, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000012', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'allocate', 'Allocate Resource & Service', 'completed', 1, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000013', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'install', 'Install & Activate Resource', 'in_progress', 2, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000014', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'provision', 'Service Provisioning', 'planned', 3, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000015', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'test', 'Test Service End-to-End', 'planned', 4, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000016', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'validate', 'CI Verification & Validation', 'planned', 5, true, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000017', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'handover', 'Handover to Operation', 'planned', 6, true, '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.delivery_handovers (
  id, tenant_id, project_id, status, created_by
)
values (
  '77777777-0001-4001-8001-000000000100',
  '11111111-1111-1111-1111-111111111111',
  '77777777-0001-4001-8001-000000000001',
  'in_progress',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.delivery_handover_items (
  id, tenant_id, project_id, item_key, title, required, completed, completed_at, completed_by, created_by
)
values
  ('77777777-0001-4001-8001-000000000101', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'scope_accepted', 'Scope and acceptance criteria confirmed', true, true, now(), '33333333-3333-3333-3333-333333333340', '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000102', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'cmdb_updated', 'CMDB and asset records updated', true, false, null, null, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000103', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'runbook_ready', 'Operations runbook and support guide delivered', true, true, now(), '33333333-3333-3333-3333-333333333340', '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000104', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'monitoring_ready', 'Monitoring, alerting, and escalation configured', true, false, null, null, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000105', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'access_verified', 'Production access and ownership verified', true, false, null, null, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000106', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'backup_rollback_ready', 'Backup and rollback procedure tested', true, false, null, null, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000107', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'known_issues_logged', 'Known issues and workarounds documented', true, false, null, null, '22222222-2222-2222-2222-222222222222'),
  ('77777777-0001-4001-8001-000000000108', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000001', 'customer_communication', 'Customer communication and support window agreed', true, false, null, null, '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.delivery_work_orders (
  id, tenant_id, project_id, external_provider, external_id, number, title, status, created_by
)
values (
  '77777777-0001-4001-8001-000000000021',
  '11111111-1111-1111-1111-111111111111',
  '77777777-0001-4001-8001-000000000001',
  'work_order_crm',
  'CRM-WO-001',
  'WO-CRM-0001',
  'Network rollout — Jakarta branch',
  'in_progress',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.tickets (
  id, tenant_id, account_id, title, description, type, status, priority, category, due_date,
  requester_name, requester_email, requester_id, assignee_id, assignee_name, task_sequential,
  delivery_project_id, created_by
)
values (
  '77777777-0001-4001-8001-000000000031',
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000004',
  'Delivery request — Jakarta branch network rollout',
  '{"type":"plain","text":"Request generated from the delivery sample project."}',
  'request',
  'in_progress',
  'medium',
  'delivery',
  current_date + 30,
  'Nova Customer',
  'customer@novacrm.app',
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'Nova Agent',
  true,
  '77777777-0001-4001-8001-000000000001',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do nothing;

update public.delivery_work_orders
set ticket_id = '77777777-0001-4001-8001-000000000031'
where id = '77777777-0001-4001-8001-000000000021';

insert into public.ticket_tasks (
  id, tenant_id, ticket_id, title, task_type, status, sort_order, delivery_project_id,
  delivery_phase_id, customer_visible, customer_title, created_by
)
values
  ('77777777-0001-4001-8001-000000000041', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Determine customer order feasibility (Survey)', 'feasibility', 'done', 0, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000011', true, 'Determine customer order feasibility (Survey)', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000042', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Allocate Resource & Service', 'allocate', 'done', 1, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000012', true, 'Allocate Resource & Service', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000043', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Install & Activate Resource', 'install', 'in_progress', 2, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000013', true, 'Install & Activate Resource', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000044', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Service Provisioning', 'provision', 'open', 3, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000014', true, 'Service Provisioning', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000045', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Test Service End-to-End', 'test', 'open', 4, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000015', true, 'Test Service End-to-End', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000046', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'CI Verification & Validation', 'validate_ci', 'open', 5, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000016', true, 'CI Verification & Validation', '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000047', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000031', 'Handover to Operation', 'handover', 'open', 6, '77777777-0001-4001-8001-000000000001', '77777777-0001-4001-8001-000000000017', true, 'Handover to Operation', '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into public.task_dependencies (
  tenant_id, predecessor_task_id, successor_task_id, dependency_type, created_by
)
values
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000041', '77777777-0001-4001-8001-000000000042', 'finish_to_start', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000042', '77777777-0001-4001-8001-000000000043', 'finish_to_start', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000043', '77777777-0001-4001-8001-000000000044', 'finish_to_start', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000044', '77777777-0001-4001-8001-000000000045', 'finish_to_start', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000045', '77777777-0001-4001-8001-000000000046', 'finish_to_start', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000046', '77777777-0001-4001-8001-000000000047', 'finish_to_start', '33333333-3333-3333-3333-333333333333')
on conflict (predecessor_task_id, successor_task_id) do nothing;

insert into public.task_activities (
  id, tenant_id, task_id, actor_id, kind, body, customer_visible, created_by
)
values
  ('77777777-0001-4001-8001-000000000051', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000041', '33333333-3333-3333-3333-333333333333', 'progress', 'Survey completed and feasibility confirmed.', true, '33333333-3333-3333-3333-333333333333'),
  ('77777777-0001-4001-8001-000000000052', '11111111-1111-1111-1111-111111111111', '77777777-0001-4001-8001-000000000043', '33333333-3333-3333-3333-333333333333', 'progress', 'Installation is currently in progress.', true, '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into public.org_units (id, tenant_id, account_id, parent_id, type, name, slug, manager_id, created_by)
values
  ('88888888-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '88888888-0001-0001-0001-000000000001', 'unit', 'Unit Network', 'network', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('88888888-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '88888888-0001-0001-0001-000000000001', 'unit', 'Unit Infra', 'infra', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('88888888-0001-0001-0001-000000000013', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', '88888888-0001-0001-0001-000000000002', 'unit', 'Unit Service Desk', 'service-desk', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

update public.profiles set org_unit_id = '88888888-0001-0001-0001-000000000012' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set org_unit_id = '88888888-0001-0001-0001-000000000013' where id = '33333333-3333-3333-3333-333333333333';

insert into public.assignment_groups (id, tenant_id, account_id, name, slug, kind, is_active, created_by)
values
  ('99999999-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'L1 Jakarta', 'l1-jakarta', 'assignment', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'CAB Infra', 'cab-infra', 'cab', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Network On-call', 'network-oncall', 'oncall', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank L1', 'bank-l1', 'assignment', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Garuda L1', 'garuda-l1', 'assignment', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'L2 Network', 'l2-network', 'assignment', true, '22222222-2222-2222-2222-222222222222'),
  ('99999999-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'L3 Infra', 'l3-infra', 'assignment', true, '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.assignment_groups (
  id, tenant_id, account_id, name, slug, kind, is_active, created_by,
  tier, party_kind, party_name, ola_response_minutes, ola_resolve_minutes
)
values
  (
    '99999999-0001-0001-0001-000000000007',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'L2 Vendor Fortinet',
    'l2-vendor-fortinet',
    'assignment',
    true,
    '22222222-2222-2222-2222-222222222222',
    'l2',
    'vendor',
    'Fortinet',
    240,
    1440
  ),
  (
    '99999999-0001-0001-0001-000000000008',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000001',
    'L3 Principal Indosat',
    'l3-principal-indosat',
    'assignment',
    true,
    '22222222-2222-2222-2222-222222222222',
    'l3',
    'principal',
    'Indosat',
    120,
    480
  )
on conflict (id) do update
set
  party_kind = excluded.party_kind,
  party_name = excluded.party_name,
  ola_response_minutes = excluded.ola_response_minutes,
  ola_resolve_minutes = excluded.ola_resolve_minutes,
  tier = excluded.tier;

insert into public.underpinning_contracts (
  id, tenant_id, name, contract_number, party_kind, party_name,
  calendar_id, coverage, starts_on, ends_on, contact_email, service_scope, penalty_notes, is_active, created_by
)
values
  (
    'b2b2b2b2-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Fortinet TAC Gold',
    'UC-FTNT-2026',
    'vendor',
    'Fortinet',
    'c1c1c1c1-0001-0001-0001-000000000001',
    '24x7',
    '2026-01-01',
    '2026-12-31',
    'tac@fortinet.example',
    'Firewall / SD-WAN hardware and firmware TAC.',
    'Missed P1 response: service credit 2% of monthly fee.',
    true,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'b2b2b2b2-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Indosat Circuit Principal',
    'UC-ISAT-2026',
    'principal',
    'Indosat',
    'c1c1c1c1-0001-0001-0001-000000000001',
    '24x7',
    '2026-01-01',
    '2026-12-31',
    'noc@indosat.example',
    'Last-mile and backbone circuits for Bank + Internal.',
    'Availability below 99.5% in a month: 1-day credit.',
    true,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do update
set
  name = excluded.name,
  party_kind = excluded.party_kind,
  party_name = excluded.party_name,
  coverage = excluded.coverage,
  is_active = excluded.is_active;

update public.assignment_groups
set uc_id = 'b2b2b2b2-0001-0001-0001-000000000001'
where id = '99999999-0001-0001-0001-000000000007';

update public.assignment_groups
set uc_id = 'b2b2b2b2-0001-0001-0001-000000000002'
where id = '99999999-0001-0001-0001-000000000008';

insert into public.assignment_group_members (tenant_id, group_id, user_id, role, created_by)
values
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000001', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000002', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000002', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000003', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000004', '33333333-3333-3333-3333-333333333333', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000005', '33333333-3333-3333-3333-333333333333', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000005', '22222222-2222-2222-2222-222222222222', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000006', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000007', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000008', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222224', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000004', '22222222-2222-2222-2222-222222222224', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000009', '22222222-2222-2222-2222-222222222224', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222223', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000004', '22222222-2222-2222-2222-222222222223', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000009', '22222222-2222-2222-2222-222222222223', 'lead', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000009', '33333333-3333-3333-3333-333333333334', 'member', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '99999999-0001-0001-0001-000000000009', '33333333-3333-3333-3333-333333333333', 'member', '22222222-2222-2222-2222-222222222222')
on conflict (group_id, user_id) do nothing;

insert into public.assets (id, tenant_id, account_id, name, asset_tag, type, brand, model, status, location, assigned_to, created_by)
values
  ('aaaaaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Laptop Finance 01', 'AST-1001', 'laptop', 'Lenovo', 'ThinkPad T14', 'active', 'Jakarta HQ', 'Finance', null),
  ('aaaaaaaa-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Laptop Ops 02', 'AST-1002', 'laptop', 'Dell', 'Latitude 5440', 'active', 'Jakarta HQ', 'Operations', null),
  ('aaaaaaaa-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'App Server 01', 'AST-2001', 'server', 'Dell', 'PowerEdge R740', 'active', 'DC-1', 'Infra', null),
  ('aaaaaaaa-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'DB Server 01', 'AST-2002', 'server', 'HP', 'ProLiant DL380', 'active', 'DC-1', 'Infra', null),
  ('aaaaaaaa-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Core Switch', 'AST-3001', 'network', 'Cisco', 'C9300', 'active', 'DC-1', 'Network', null),
  ('aaaaaaaa-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Firewall Edge', 'AST-3002', 'network', 'Fortinet', 'FortiGate 200F', 'active', 'DC-1', 'Network', null),
  ('aaaaaaaa-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Printer Marketing', 'AST-4001', 'printer', 'HP', 'LaserJet MFP', 'in_repair', 'Lt. 3', 'Marketing', null),
  ('aaaaaaaa-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Printer Warehouse', 'AST-4002', 'printer', 'Epson', 'L6490', 'active', 'Gudang', 'Warehouse', null),
  ('aaaaaaaa-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Mobile Field 01', 'AST-5001', 'mobile', 'Samsung', 'A55', 'active', 'Field', 'Sales', null),
  ('aaaaaaaa-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Mobile Field 02', 'AST-5002', 'mobile', 'Samsung', 'A55', 'lost', 'Field', 'Sales', null),
  ('aaaaaaaa-0001-0001-0001-000000000019', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank App Server HQ', 'AST-3301', 'server', 'Dell', 'PowerEdge R650', 'active', 'Jakarta HQ', 'Apps', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000020', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank DB Server HQ', 'AST-3302', 'server', 'Dell', 'PowerEdge R750', 'active', 'Jakarta HQ', 'Database', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

update public.assets set
  purchase_date = date '2024-02-15',
  warranty_expiry = date '2026-09-15',
  cost = 18500000,
  useful_life_months = 36
where id = 'aaaaaaaa-0001-0001-0001-000000000001';
update public.assets set
  purchase_date = date '2024-06-01',
  warranty_expiry = date '2026-08-20',
  cost = 17200000
where id = 'aaaaaaaa-0001-0001-0001-000000000002';
update public.assets set
  purchase_date = date '2023-01-10',
  warranty_expiry = date '2026-01-10',
  cost = 185000000,
  useful_life_months = 60
where id = 'aaaaaaaa-0001-0001-0001-000000000003';
update public.assets set
  purchase_date = date '2023-01-10',
  warranty_expiry = date '2026-01-10',
  cost = 210000000,
  useful_life_months = 60
where id = 'aaaaaaaa-0001-0001-0001-000000000004';
update public.assets set
  purchase_date = date '2024-03-01',
  warranty_expiry = date '2027-03-01',
  cost = 45000000
where id = 'aaaaaaaa-0001-0001-0001-000000000005';
update public.assets set
  purchase_date = date '2024-03-01',
  warranty_expiry = date '2027-03-01',
  cost = 78000000
where id = 'aaaaaaaa-0001-0001-0001-000000000006';
update public.assets set
  purchase_date = date '2022-11-01',
  warranty_expiry = date '2026-08-01',
  cost = 8500000
where id = 'aaaaaaaa-0001-0001-0001-000000000007';
update public.assets set
  purchase_date = date '2025-01-12',
  warranty_expiry = date '2027-01-12',
  cost = 6200000
where id = 'aaaaaaaa-0001-0001-0001-000000000008';
update public.assets set
  purchase_date = date '2025-04-01',
  warranty_expiry = date '2026-08-25',
  cost = 4500000
where id = 'aaaaaaaa-0001-0001-0001-000000000009';
update public.assets set
  purchase_date = date '2025-04-01',
  warranty_expiry = date '2026-04-01',
  cost = 4500000
where id = 'aaaaaaaa-0001-0001-0001-000000000010';

insert into public.cmdb_items (id, tenant_id, account_id, asset_id, name, type, attributes, relations, created_by)
values
  ('bbbbbbbb-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000003', 'prod-app-01', 'server', '{"env":"prod"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000002","type":"depends_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000004', 'prod-db-01', 'database', '{"engine":"postgres"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000005', 'core-sw-01', 'network', '{"role":"core"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"connects"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000006', 'fw-edge-01', 'network', '{"role":"edge"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000003","type":"protects"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', null, 'crm-web', 'service', '{"stack":"nextjs"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"runs_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', null, 'crm-worker', 'service', '{"stack":"bullmq"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000001","type":"runs_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', null, 'vpn-gateway', 'service', '{"vendor":"fortinet"}', '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000004","type":"hosted_on"}]', null),
  ('bbbbbbbb-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000007', 'print-mkt', 'printer', '{"floor":"3"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'laptop-fin-01', 'endpoint', '{"owner":"finance"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000002', 'laptop-ops-02', 'endpoint', '{"owner":"ops"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000008', 'print-wh', 'printer', '{"site":"gudang"}', '[]', null),
  ('bbbbbbbb-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000010', 'mobile-field-02', 'endpoint', '{"owner":"sales"}', '[]', null)
on conflict (id) do nothing;

insert into public.assets (
  id, tenant_id, account_id, name, asset_tag, type, brand, model, status, location, assigned_to, created_by
)
values
  ('aaaaaaaa-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank Firewall HQ', 'AST-3101', 'network', 'Fortinet', 'FortiGate 60F', 'active', 'Jakarta HQ', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank Core Switch', 'AST-3102', 'network', 'Cisco', 'C9200', 'active', 'Jakarta HQ', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000013', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank Access Lt. 2', 'AST-3103', 'network', 'Cisco', 'C2960', 'active', 'Lt. 2', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000014', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank Access Lt. 3', 'AST-3104', 'network', 'Cisco', 'C2960', 'active', 'Lt. 3', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000015', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Bank AP Lt. 2', 'AST-3105', 'network', 'Cisco', 'CW9164', 'active', 'Lt. 2', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000016', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Garuda Firewall', 'AST-3201', 'network', 'Fortinet', 'FortiGate 40F', 'active', 'Gudang', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000017', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Garuda Switch Gudang', 'AST-3202', 'network', 'Cisco', 'C1000', 'active', 'Gudang', 'Network', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0001-0001-0001-000000000018', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Garuda AP Gudang', 'AST-3203', 'network', 'Ubiquiti', 'U6-Pro', 'active', 'Gudang', 'Network', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.cmdb_items (id, tenant_id, account_id, asset_id, name, type, attributes, relations, created_by)
values
  ('bbbbbbbb-0001-0001-0001-000000000013', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', null, 'bank-wan-indosat', 'network', '{"role":"wan","site":"Jakarta HQ","circuit":"Indosat 100M"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000014', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000011', 'bank-fw-hq', 'network', '{"role":"edge","site":"Jakarta HQ"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000015', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000012', 'bank-core-sw', 'network', '{"role":"core","site":"Jakarta HQ"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000016', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000013', 'bank-acc-lt2', 'network', '{"role":"access","site":"Jakarta HQ","floor":"2"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000017', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000014', 'bank-acc-lt3', 'network', '{"role":"access","site":"Jakarta HQ","floor":"3"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000018', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000015', 'bank-ap-lt2', 'network', '{"role":"ap","site":"Jakarta HQ","ssid":"BN-Corp","floor":"2"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000019', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', null, 'garuda-wan-xl', 'network', '{"role":"wan","site":"Gudang","circuit":"XL 50M"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000020', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000016', 'garuda-fw', 'network', '{"role":"edge","site":"Gudang"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000021', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000017', 'garuda-sw-wh', 'network', '{"role":"access","site":"Gudang"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000022', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000018', 'garuda-ap-wh', 'network', '{"role":"ap","site":"Gudang","ssid":"GL-WH"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000023', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000019', 'bank-core-app', 'application', '{"role":"core-banking","site":"Jakarta HQ"}', '[]', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0001-0001-0001-000000000024', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000020', 'bank-core-db', 'database', '{"engine":"postgres","site":"Jakarta HQ"}', '[]', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000014","type":"connects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000013';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000015","type":"protects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000014';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000016","type":"connects"},{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"connects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000015';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000018","type":"connects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000016';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000020","type":"connects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000019';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000021","type":"protects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000020';
update public.cmdb_items set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000022","type":"connects"}]'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000021';

update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ","floor":"3"}'::jsonb,
    relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000008';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ"}'::jsonb,
    relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000009';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ"}'::jsonb,
    relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000018","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000010';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Gudang"}'::jsonb,
    relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000021","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000011';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Gudang"}'::jsonb,
    relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000022","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000012';
update public.cmdb_items
set attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"DC-1"}'::jsonb
where id in (
  'bbbbbbbb-0001-0001-0001-000000000001',
  'bbbbbbbb-0001-0001-0001-000000000002',
  'bbbbbbbb-0001-0001-0001-000000000003',
  'bbbbbbbb-0001-0001-0001-000000000004',
  'bbbbbbbb-0001-0001-0001-000000000005',
  'bbbbbbbb-0001-0001-0001-000000000006',
  'bbbbbbbb-0001-0001-0001-000000000007'
);

insert into public.ip_segments (id, tenant_id, account_id, cmdb_item_id, name, cidr, vlan, gateway, purpose, created_by)
values
  ('cccccccc-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000014', 'WAN inside', '10.20.254.0/30', 99, '10.20.254.1', 'wan', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000015', 'Mgmt HQ', '10.20.0.0/24', 10, '10.20.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000016', 'Users Lt.2', '10.20.2.0/24', 20, '10.20.2.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000017', 'Users Lt.3', '10.20.3.0/24', 30, '10.20.3.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000018', 'WiFi BN-Corp', '10.20.50.0/24', 50, '10.20.50.1', 'wifi', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000020', 'Mgmt gudang', '10.30.0.0/24', 10, '10.30.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000021', 'LAN gudang', '10.30.10.0/24', 20, '10.30.10.1', 'user', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'bbbbbbbb-0001-0001-0001-000000000022', 'WiFi GL-WH', '10.30.50.0/24', 50, '10.30.50.1', 'wifi', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000003', 'Mgmt DC-1', '10.0.0.0/24', 10, '10.0.0.1', 'mgmt', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-00000000000a', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000003', 'Servers', '10.0.10.0/24', 20, '10.0.10.1', 'server', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0001-0001-0001-00000000000b', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000004', 'VPN pool', '10.0.20.0/24', 30, '10.0.20.1', 'vpn', '22222222-2222-2222-2222-222222222222')
on conflict (account_id, cidr) do nothing;

update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.3.20"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000008';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.3.41"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000009';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.20.50.18"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000010';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.30.10.20"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000011';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.30.50.88"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000012';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.0.10.11"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000001';
update public.cmdb_items set attributes = coalesce(attributes, '{}'::jsonb) || '{"ip":"10.0.10.12"}'::jsonb where id = 'bbbbbbbb-0001-0001-0001-000000000002';

insert into public.tickets (
  tenant_id, account_id, title, description, type, status, priority, category, due_date,
  requester_name, requester_email, requester_id, assignee_id, assignee_name, asset_id, created_by
)
values
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Laptop tidak bisa boot', '{"type":"plain","text":"Laptop user blue screen saat mulai."}', 'incident', 'open', 'high', 'hardware', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, 'aaaaaaaa-0001-0001-0001-000000000001', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'VPN tidak terhubung', '{"type":"plain","text":"Gagal VPN dari rumah."}', 'incident', 'in_progress', 'critical', 'network', now() + interval '12 hours', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Nova Agent', null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Printer offline', '{"type":"plain","text":"Printer marketing tidak bisa dipakai."}', 'incident', 'waiting', 'medium', 'printer', now() + interval '2 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, 'aaaaaaaa-0001-0001-0001-000000000007', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Email tertunda', '{"type":"plain","text":"Inbox tertahan di relay."}', 'incident', 'open', 'high', 'email', now() + interval '8 hours', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Monitor bergaris', '{"type":"plain","text":"Garis vertikal di monitor QA."}', 'incident', 'resolved', 'low', 'hardware', now() - interval '1 day', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Aplikasi CRM lag', '{"type":"plain","text":"CRM lambat saat jam kerja."}', 'problem', 'in_progress', 'high', 'application', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Nova Agent', null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Password tidak bisa reset', '{"type":"plain","text":"Email reset tidak diterima."}', 'request', 'waiting', 'medium', 'identity', now() + interval '3 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Server database warning', '{"type":"plain","text":"CPU DB di atas threshold."}', 'problem', 'open', 'critical', 'infrastructure', now() + interval '6 hours', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Nova Agent', 'aaaaaaaa-0001-0001-0001-000000000004', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'User baru butuh akun', '{"type":"plain","text":"Akses Gmail dan Slack untuk sales baru."}', 'request', 'closed', 'low', 'access', now() - interval '3 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'Scanner gagal baca barcode', '{"type":"plain","text":"Scanner gudang tidak baca label baru."}', 'incident', 'open', 'medium', 'scanner', now() + interval '2 days', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', null, null, 'aaaaaaaa-0001-0001-0001-000000000008', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'WiFi lantai 2 putus', '{"type":"plain","text":"SSID lantai 2 sering disconnect."}', 'incident', 'hold', 'high', 'network', now() + interval '10 hours', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, 'aaaaaaaa-0001-0001-0001-000000000015', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Lisensi Office habis', '{"type":"plain","text":"Aktivasi Office gagal."}', 'request', 'open', 'medium', 'license', now() + interval '4 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, 'aaaaaaaa-0001-0001-0001-000000000002', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Backup gagal semalam', '{"type":"plain","text":"Job pg_dump exit 1."}', 'problem', 'in_progress', 'critical', 'infrastructure', now() + interval '4 hours', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Nova Agent', 'aaaaaaaa-0001-0001-0001-000000000004', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Akses GitHub hilang', '{"type":"plain","text":"SSO GitHub menolak user."}', 'incident', 'waiting', 'high', 'identity', now() + interval '1 day', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'AC ruang server panas', '{"type":"plain","text":"Suhu DC-1 29C."}', 'incident', 'open', 'critical', 'facilities', now() + interval '3 hours', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Request laptop baru', '{"type":"plain","text":"Karyawan baru butuh laptop."}', 'request', 'hold', 'low', 'request', now() + interval '5 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Phishing email masuk', '{"type":"plain","text":"Beberapa user klik lampiran mencurigakan."}', 'incident', 'in_progress', 'critical', 'security', now() + interval '2 hours', 'Nova Admin', 'admin@novacrm.app', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Nova Agent', null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Aplikasi absensi error', '{"type":"plain","text":"Check-in gagal 500."}', 'incident', 'open', 'high', 'application', now() + interval '9 hours', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'Kabel LAN putus', '{"type":"plain","text":"Port 24 di lantai 1 mati."}', 'incident', 'resolved', 'medium', 'network', now() - interval '2 days', 'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444', null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Update Windows tertahan', '{"type":"plain","text":"WSUS tidak push patch."}', 'change', 'closed', 'low', 'endpoint', now() - interval '4 days', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Nova Agent', null, null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Firewall ACL for partner VPN', '{"type":"plain","text":"Allow partner CIDR on FortiGate."}', 'change', 'waiting', 'high', 'network', now() + interval '2 days', 'Nova Agent', 'agent@novacrm.app', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Nova Agent', 'aaaaaaaa-0001-0001-0001-000000000006', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'PostgreSQL minor patch', '{"type":"plain","text":"Apply 16.x security patch on prod-db-01."}', 'change', 'hold', 'medium', 'infrastructure', now() + interval '1 day', 'Nova Admin', 'admin@novacrm.app', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Nova Agent', 'aaaaaaaa-0001-0001-0001-000000000004', null),
  ('11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'Emergency VPN certificate rotate', '{"type":"plain","text":"Cert expires tonight. eCAB."}', 'change', 'waiting', 'critical', 'security', now() + interval '6 hours', 'Nova Admin', 'admin@novacrm.app', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Nova Agent', 'aaaaaaaa-0001-0001-0001-000000000006', null);

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000001'
where account_id = '55555555-0001-0001-0001-000000000001'
  and type in ('incident', 'problem', 'request')
  and group_id is null;

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000002'
where account_id = '55555555-0001-0001-0001-000000000001'
  and type = 'change'
  and group_id is null;

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000004'
where account_id = '55555555-0001-0001-0001-000000000002'
  and group_id is null;

insert into public.notification_channels (tenant_id, type, config, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'whatsapp', '{"target":"6281234567890"}', false),
  ('11111111-1111-1111-1111-111111111111', 'telegram', '{"chatId":"-1001234567890"}', false),
  ('11111111-1111-1111-1111-111111111111', 'email', '{"from":"NovaCRM <no-reply@novacrm.app>"}', true)
on conflict (tenant_id, type) do nothing;

-- notification_templates: empty = product i18n defaults. Admin customizes at /settings/notifications.

insert into public.workflow_rules (tenant_id, name, event, action, target, is_active, definition)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Auto assign new ticket',
    'ticket.create',
    'assign',
    '33333333-3333-3333-3333-333333333333',
    true,
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":80,"y":140},"data":{"event":"ticket.create"}},{"id":"action-1","type":"action","position":{"x":380,"y":140},"data":{"action":"assign","target":"33333333-3333-3333-3333-333333333333"}}],"edges":[{"id":"e1","source":"trigger","target":"action-1"}]}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Notify requester on status change',
    'ticket.status_change',
    'send_email',
    'requester',
    true,
    '{"nodes":[{"id":"trigger","type":"trigger","position":{"x":80,"y":140},"data":{"event":"ticket.status_change"}},{"id":"action-1","type":"action","position":{"x":380,"y":140},"data":{"action":"send_email","target":"requester"}}],"edges":[{"id":"e1","source":"trigger","target":"action-1"}]}'::jsonb
  )
on conflict do nothing;

insert into public.report_schedules (
  tenant_id, is_active, recipients, range_days, send_hour, timezone, include_aging, created_by
)
values (
  '11111111-1111-1111-1111-111111111111',
  false,
  'admin@novacrm.app',
  7,
  7,
  'Asia/Jakarta',
  true,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (tenant_id) do nothing;

insert into public.notification_logs (tenant_id, channel, recipient, subject, body, status)
values
  ('11111111-1111-1111-1111-111111111111', 'whatsapp', '6281234567890', 'Ticket baru dibuat', 'Halo, tiket baru telah dibuat.', 'sent'),
  ('11111111-1111-1111-1111-111111111111', 'telegram', '-1001234567890', 'Update status', 'Ada update status tiket baru.', 'sent'),
  ('11111111-1111-1111-1111-111111111111', 'email', 'customer@example.com', 'Ticket dibuat', 'Ticket Anda telah dibuat.', 'sent');

insert into public.catalog_categories (id, tenant_id, name, slug, description, sort_order, is_active)
values
  ('cccccccc-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Hardware', 'hardware', 'Devices and peripherals', 1, true),
  ('cccccccc-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Access', 'access', 'Accounts and connectivity', 2, true),
  ('cccccccc-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Software', 'software', 'Applications and licenses', 3, true),
  ('cccccccc-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Incidents', 'incidents', 'Service disruption', 4, true),
  ('cccccccc-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Standard change', 'standard-change', 'Pre-approved low-risk changes', 5, true),
  ('cccccccc-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Network', 'network', 'LAN, WAN, VPN, and connectivity', 6, true),
  ('cccccccc-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Database', 'database', 'Database availability and access', 7, true),
  ('cccccccc-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Datacenter', 'datacenter', 'Power, cooling, rack, and hall facilities', 8, true),
  ('cccccccc-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'CCTV', 'cctv', 'Cameras, NVR/DVR, and footage requests', 9, true)
on conflict (id) do nothing;

insert into public.catalog_variable_sets (id, tenant_id, name, description, variables)
values (
  'dddddddd-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Requester details',
  'Location and cost center',
  '[{"key":"location","label":"Location","type":"select","required":true,"options":["Jakarta HQ","DC-1","Remote"]},{"key":"cost_center","label":"Cost center","type":"text","required":false}]'::jsonb
)
on conflict (id) do nothing;

insert into public.catalog_items (
  id, tenant_id, category_id, variable_set_id, name, slug, short_description, description,
  icon, ticket_type, priority, variables, fulfillment_steps, fulfillment_sequential, is_active
)
values
  (
    'eeeeeeee-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000001',
    'dddddddd-0001-0001-0001-000000000001',
    'Request a laptop',
    'request-laptop',
    'Standard employee laptop',
    'Fulfillment provisions a laptop from ITAM stock.',
    'laptop',
    'request',
    'medium',
    '[{"key":"model","label":"Preferred model","type":"select","required":true,"options":["ThinkPad T14","Latitude 5440"]},{"key":"justification","label":"Business justification","type":"textarea","required":true}]'::jsonb,
    '[
      {"title":"Determine customer order feasibility (survey)","taskType":"feasibility","sortOrder":0},
      {"title":"Allocate resource & service","taskType":"allocate","sortOrder":1},
      {"title":"Install & activate resource","taskType":"install","sortOrder":2},
      {"title":"Service provisioning","taskType":"provision","sortOrder":3},
      {"title":"Test service end-to-end","taskType":"test","sortOrder":4},
      {"title":"CI verification & validation","taskType":"validate_ci","sortOrder":5},
      {"title":"Handover to operation","taskType":"handover","sortOrder":6}
    ]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000002',
    'dddddddd-0001-0001-0001-000000000001',
    'VPN access',
    'vpn-access',
    'Remote access to the corporate network',
    'Identity team enables VPN for the requester.',
    'wifi',
    'request',
    'medium',
    '[{"key":"duration","label":"Duration","type":"select","required":true,"options":["30 days","90 days","Permanent"]},{"key":"manager","label":"Manager email","type":"text","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000003',
    'dddddddd-0001-0001-0001-000000000001',
    'Install software',
    'install-software',
    'Request an approved application',
    'Software is packaged and assigned after license check.',
    'app',
    'request',
    'low',
    '[{"key":"application","label":"Application","type":"text","required":true},{"key":"reason","label":"Why you need it","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000002',
    null,
    'Password reset',
    'password-reset',
    'Unlock or reset a directory account',
    'Standard change: identity reset after verification.',
    'key',
    'request',
    'high',
    '[{"key":"account","label":"Account / email","type":"text","required":true},{"key":"verified","label":"I can verify identity","type":"checkbox","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000004',
    null,
    'Report a service outage',
    'report-outage',
    'Unplanned interruption to a business service',
    'Opens an incident for the service desk.',
    'alert',
    'incident',
    'high',
    '[{"key":"service","label":"Service","type":"select","required":true,"options":["Email","VPN","ERP","Internet"]},{"key":"impact","label":"Who is affected","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000006',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000005',
    null,
    'Restart application service',
    'std-restart-service',
    'Bounce a published service during the maintenance window',
    '1. Confirm the CI and window with the owner.' || E'\n' ||
    '2. Drain connections / put the instance in maintenance.' || E'\n' ||
    '3. Restart the service and watch health checks for 10 minutes.' || E'\n' ||
    '4. Return the instance to service and notify the requester.',
    'app',
    'change',
    'low',
    '[{"key":"service","label":"Service / CI","type":"text","required":true},{"key":"window","label":"Maintenance window","type":"select","required":true,"options":["Tonight 22:00-23:00","Sunday 06:00-08:00","Next approved window"]}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000007',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000005',
    null,
    'Add pre-approved firewall allow rule',
    'std-firewall-allow',
    'Open an already-reviewed destination on the edge firewall',
    '1. Confirm source, destination, and port match the approved pattern.' || E'\n' ||
    '2. Add the allow rule on the standby / candidate policy.' || E'\n' ||
    '3. Commit during the window and verify the flow.' || E'\n' ||
    '4. Document the rule ID on the change.',
    'wifi',
    'change',
    'medium',
    '[{"key":"source","label":"Source CIDR / host","type":"text","required":true},{"key":"destination","label":"Destination","type":"text","required":true},{"key":"port","label":"Port / protocol","type":"text","required":true,"placeholder":"443/tcp"}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000008',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000005',
    null,
    'Renew TLS certificate',
    'std-cert-renew',
    'Replace an expiring certificate on a published endpoint',
    '1. Issue or import the replacement certificate.' || E'\n' ||
    '2. Install on the target, keep the previous cert staged.' || E'\n' ||
    '3. Reload the listener and verify HTTPS and expiry.' || E'\n' ||
    '4. Remove the old cert after 24 hours of healthy checks.',
    'key',
    'change',
    'medium',
    '[{"key":"hostname","label":"Hostname","type":"text","required":true},{"key":"expiry","label":"Current expiry","type":"text","required":false}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000009',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000006',
    null,
    'LAN / switch down',
    'lan-switch-down',
    'Access or core switch is unreachable',
    'Incident for LAN port, VLAN, or switch outage on a customer CI.',
    'wifi',
    'incident',
    'high',
    '[{"key":"location","label":"Floor / site","type":"text","required":true},{"key":"symptom","label":"What failed","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000010',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000006',
    null,
    'WAN / internet down',
    'wan-internet-down',
    'Site circuit or internet link is down',
    'Incident for WAN circuit, ISP, or edge firewall path.',
    'wifi',
    'incident',
    'critical',
    '[{"key":"site","label":"Site","type":"text","required":true},{"key":"provider","label":"ISP / circuit","type":"text","required":false}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000011',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000006',
    null,
    'VPN cannot connect',
    'vpn-cannot-connect',
    'Remote users cannot reach the corporate VPN',
    'Incident for VPN gateway or client connect failure.',
    'wifi',
    'incident',
    'high',
    '[{"key":"user_count","label":"Who is affected","type":"text","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000012',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000003',
    null,
    'Business application error',
    'app-error',
    'Published application is slow or returning errors',
    'Incident against an application or tech service in CMDB.',
    'app',
    'incident',
    'high',
    '[{"key":"application","label":"Application / CI","type":"text","required":true},{"key":"error","label":"Error or behaviour","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000013',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000003',
    null,
    'Install approved software',
    'install-approved-software',
    'Request a packaged application on an endpoint',
    'Request after license and CMDB application check.',
    'app',
    'request',
    'medium',
    '[{"key":"application","label":"Application","type":"text","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000014',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000007',
    null,
    'Database unavailable',
    'database-unavailable',
    'Database or listener is down or rejecting connections',
    'Incident for a database CI or DB server asset.',
    'database',
    'incident',
    'critical',
    '[{"key":"database","label":"Database / CI","type":"text","required":true},{"key":"error","label":"Error message","type":"textarea","required":false}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000015',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000007',
    null,
    'Database access request',
    'database-access',
    'Read or write access to an existing database',
    'Request scoped to a database CI the account owns.',
    'key',
    'request',
    'medium',
    '[{"key":"database","label":"Database / CI","type":"text","required":true},{"key":"access","label":"Access needed","type":"select","required":true,"options":["Read","Read/write","Owner"]}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000016',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000008',
    null,
    'Datacenter facility issue',
    'dc-facility-issue',
    'Power, cooling, or hall access problem',
    'Incident for DC facility impacting hosted servers or storage.',
    'server',
    'incident',
    'high',
    '[{"key":"hall","label":"Hall / rack","type":"text","required":true},{"key":"symptom","label":"Symptom","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000017',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000008',
    null,
    'Server / rack access',
    'dc-rack-access',
    'Escort or hands-on access to a racked server',
    'Request against a server asset in the customer datacenter.',
    'server',
    'request',
    'medium',
    '[{"key":"server","label":"Server / asset tag","type":"text","required":true},{"key":"window","label":"Preferred window","type":"text","required":false}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000018',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000009',
    null,
    'CCTV camera offline',
    'cctv-camera-offline',
    'Camera is down, black, or not recording',
    'Incident for a camera CI or CCTV asset. Ticket can still be opened if the camera is not yet in CMDB.',
    'cctv',
    'incident',
    'high',
    '[{"key":"location","label":"Location / camera name","type":"text","required":true},{"key":"symptom","label":"What failed","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000019',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000009',
    null,
    'CCTV image quality',
    'cctv-image-quality',
    'Blur, night vision, or wrong angle',
    'Incident for picture quality on an existing or unlisted camera.',
    'cctv',
    'incident',
    'medium',
    '[{"key":"location","label":"Location / camera name","type":"text","required":true},{"key":"symptom","label":"Quality issue","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000020',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000009',
    null,
    'NVR / recorder down',
    'cctv-nvr-down',
    'NVR, DVR, or VMS cannot record or play back',
    'Incident against a recorder CI. Open even if the NVR is not in the account estate.',
    'cctv',
    'incident',
    'critical',
    '[{"key":"recorder","label":"NVR / site","type":"text","required":true},{"key":"symptom","label":"Symptom","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000021',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000009',
    null,
    'Request CCTV footage',
    'cctv-footage-request',
    'Export playback for a time window',
    'Request scoped to a camera or site. Desk verifies policy before export.',
    'cctv',
    'request',
    'medium',
    '[{"key":"location","label":"Camera / site","type":"text","required":true},{"key":"window","label":"Date and time window","type":"text","required":true},{"key":"reason","label":"Business reason","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000022',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000009',
    null,
    'Install new CCTV',
    'cctv-install',
    'Add a camera that is not yet in the estate',
    'Request to survey, install, and register a new CCTV asset and CI.',
    'cctv',
    'request',
    'medium',
    '[{"key":"location","label":"Proposed location","type":"text","required":true},{"key":"reason","label":"Why it is needed","type":"textarea","required":true}]'::jsonb,
    '[]'::jsonb,
    true,
    true
  )
on conflict (id) do nothing;

update public.tickets
set
  change_type = 'standard',
  risk_level = 'low',
  planned_start = created_at,
  planned_end = created_at + interval '2 hours',
  implementation_plan = 'WSUS approval group, staged rollout.',
  backout_plan = 'Pause WSUS and roll back last patch.'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and title = 'Update Windows tertahan';

update public.tickets
set
  change_type = 'normal',
  risk_level = 'high',
  planned_start = date_trunc('week', now()) + interval '2 days 21 hours',
  planned_end = date_trunc('week', now()) + interval '2 days 23 hours',
  implementation_plan = 'Add partner prefix to FortiGate policy 40. Validate with ping then VPN.',
  backout_plan = 'Disable policy 40.'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and title = 'Firewall ACL for partner VPN';

update public.tickets
set
  change_type = 'normal',
  risk_level = 'medium',
  planned_start = date_trunc('week', now()) + interval '3 days 22 hours',
  planned_end = date_trunc('week', now()) + interval '4 days 1 hour',
  implementation_plan = 'Patch prod-db-01 during maintenance window. Failover check.',
  backout_plan = 'Restore previous package from snapshot.'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and title = 'PostgreSQL minor patch';

update public.tickets
set
  change_type = 'emergency',
  risk_level = 'critical',
  planned_start = now() + interval '2 hours',
  planned_end = now() + interval '4 hours',
  implementation_plan = 'Rotate VPN cert, push to FortiGate, notify remote users.',
  backout_plan = 'Reinstall previous cert from vault.'
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and title = 'Emergency VPN certificate rotate';

insert into public.privacy_settings (
  tenant_id, dpo_name, dpo_email, dpo_phone, controller_name, controller_address,
  notice_title, notice_body, lawful_basis_default, cross_border_allowed, is_published, created_by
) values (
  '11111111-1111-1111-1111-111111111111',
  'Nova Admin',
  'dpo@novacrm.app',
  '628111000001',
  'NovaCRM Demo Tenant',
  'Jakarta HQ, Indonesia',
  'Pemberitahuan privasi NovaCRM',
  E'PEMBERITAHUAN PRIVASI (PRIVACY NOTICE)\nNovaCRM\nTerakhir diperbarui: Agustus 2026\n\nNovaCRM ("Kami") berkomitmen melindungi privasi Anda sesuai UU 27/2022 tentang Pelindungan Data Pribadi.\n\n1. Data yang dikumpulkan: identitas, kontak, tiket/interaksi, aset/CI terkait, dan data akun.\n2. Tujuan: layanan ITSM, tindak lanjut tiket, notifikasi operasional, kewajiban hukum. Pemasaran hanya dengan opt-in terpisah.\n3. Dasar hukum: persetujuan, kontrak, kewajiban hukum, dan kepentingan yang sah. Penggunaan portal 30 hari tanpa keberatan dianggap persetujuan; SLA respons hak adalah 30 hari terpisah.\n4. Hak subjek data: akses, koreksi, penghapusan, pembatasan, portabilitas, dan penarikan persetujuan melalui portal Privasi.\n5. Keamanan dan retensi sesuai tujuan pengumpulan atau retensi hukum. Kebocoran dilaporkan dalam 72 jam bila diwajibkan.\n6. Cookie yang diperlukan: tema, bahasa, tanggal pemberitahuan, dan welcome.\n7. Prosesor: email, WhatsApp, Telegram, MinIO/S3, hosting. Data tidak dijual.\n8. DPO: dpo@novacrm.app',
  'contract',
  false,
  false,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (tenant_id) do update set
  dpo_name = excluded.dpo_name,
  notice_title = excluded.notice_title,
  notice_body = excluded.notice_body,
  is_published = excluded.is_published;

insert into public.processing_activities (
  id, tenant_id, name, purpose, lawful_basis, data_categories, data_subjects,
  recipients, retention_days, cross_border, security_measures, status, created_by
) values
  (
    'bbbbbbbb-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Service desk tickets',
    'Create and resolve incidents, problems, changes, and requests.',
    'contract',
    array['identity','contact','employment'],
    array['employee','customer'],
    'Internal IT agents; email processor',
    730,
    false,
    'RLS tenant isolation, RBAC, audit timestamps, TLS in transit.',
    'active',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Asset assignment',
    'Track company devices assigned to staff.',
    'legitimate_interest',
    array['identity','employment','location'],
    array['employee'],
    'IT asset owners',
    1095,
    false,
    'Least-privilege agent role; serial numbers limited to staff.',
    'active',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Ticket notifications',
    'Email, WhatsApp, and Telegram status updates.',
    'contract',
    array['contact','identity'],
    array['employee','customer'],
    'SMTP/Mailpit; optional WhatsApp/Telegram processors',
    365,
    false,
    'Channel secrets in tenant config; no payload stored beyond logs.',
    'active',
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.data_subject_requests (
  id, tenant_id, request_type, status, subject_name, subject_email, requester_id,
  description, due_date, resolution, assigned_name, created_by
) values
  (
    'cccccccc-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'access',
    'received',
    'Nova Customer',
    'customer@novacrm.app',
    '44444444-4444-4444-4444-444444444444',
    'Please provide a copy of my ticket and profile data.',
    now() + interval '26 days',
    null,
    null,
    '44444444-4444-4444-4444-444444444444'
  ),
  (
    'cccccccc-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'erasure',
    'completed',
    'Former contractor',
    'alumni@example.com',
    null,
    'Remove contractor phone from closed tickets after offboarding.',
    now() - interval '2 days',
    'Phone fields cleared on two closed tickets. Email retained for legal hold 90 days.',
    'Nova Agent',
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.data_breaches (
  id, tenant_id, title, description, discovered_at, notified_at, severity, status,
  affected_count, data_categories, notify_authority, notify_subjects, containment, created_by
) values
  (
    'dddddddd-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Mailbox mis-send of ticket export',
    'CSV export of 12 requester emails sent to the wrong internal DL.',
    now() - interval '60 hours',
    null,
    'medium',
    'contained',
    12,
    array['contact','identity'],
    true,
    false,
    'Recalled message. DL membership reviewed. Export scoped to queue owners.',
    '33333333-3333-3333-3333-333333333333'
  )
on conflict (id) do nothing;

insert into public.sla_calendars (
  id, tenant_id, account_id, name, timezone, is_24x7, business_hours, holidays, created_by
)
values
  (
    'c1c1c1c1-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    null,
    'Nova office hours',
    'Asia/Jakarta',
    false,
    '{"mon":[["08:00","17:00"]],"tue":[["08:00","17:00"]],"wed":[["08:00","17:00"]],"thu":[["08:00","17:00"]],"fri":[["08:00","17:00"]],"sat":[],"sun":[]}'::jsonb,
    '[{"date":"2026-01-01","name":"Tahun Baru"},{"date":"2026-08-17","name":"Hari Kemerdekaan"},{"date":"2026-12-25","name":"Natal"}]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'c1c1c1c1-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'Bank Gold hours',
    'Asia/Jakarta',
    false,
    '{"mon":[["07:00","21:00"]],"tue":[["07:00","21:00"]],"wed":[["07:00","21:00"]],"thu":[["07:00","21:00"]],"fri":[["07:00","21:00"]],"sat":[["08:00","13:00"]],"sun":[]}'::jsonb,
    '[{"date":"2026-01-01","name":"Tahun Baru"},{"date":"2026-08-17","name":"Hari Kemerdekaan"},{"date":"2026-12-24","name":"Malam Natal"},{"date":"2026-12-25","name":"Natal"}]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

insert into public.sla_agreements (
  id, tenant_id, account_id, calendar_id, name, pause_on_waiting, is_active, created_by
)
values
  ('a9a9a9a9-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000001', 'c1c1c1c1-0001-0001-0001-000000000001', 'Internal office', true, true, '22222222-2222-2222-2222-222222222222'),
  ('a9a9a9a9-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000002', 'c1c1c1c1-0001-0001-0001-000000000002', 'Bank Gold', true, true, '22222222-2222-2222-2222-222222222222'),
  ('a9a9a9a9-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-0001-0001-0001-000000000003', 'c1c1c1c1-0001-0001-0001-000000000001', 'Garuda Standard', true, true, '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.sla_targets (
  tenant_id, agreement_id, ticket_type, priority, response_minutes, resolve_minutes, created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  t.agreement_id,
  t.ticket_type::public.ticket_type,
  t.priority::public.ticket_priority,
  t.response_minutes,
  t.resolve_minutes,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'critical', 30, 240),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'high', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'medium', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'incident', 'low', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'problem', 'low', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'critical', 120, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'change', 'low', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000001'::uuid, 'request', 'low', 480, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'critical', 15, 240),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'high', 30, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'medium', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'incident', 'low', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'critical', 30, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'high', 60, 960),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'problem', 'low', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'high', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'change', 'low', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'critical', 30, 240),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'high', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'medium', 120, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000002'::uuid, 'request', 'low', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'critical', 60, 480),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'high', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'medium', 240, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'incident', 'low', 480, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'critical', 120, 960),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'medium', 480, 4320),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'problem', 'low', 960, 8640),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'critical', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'high', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'medium', 960, 5760),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'change', 'low', 1440, 8640),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'critical', 120, 480),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'high', 240, 1440),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'medium', 480, 2880),
    ('a9a9a9a9-0001-0001-0001-000000000003'::uuid, 'request', 'low', 960, 5760)
) as t(agreement_id, ticket_type, priority, response_minutes, resolve_minutes)
on conflict (agreement_id, ticket_type, priority) do nothing;

update public.tickets t
set
  sla_agreement_id = a.id,
  sla_response_minutes = tgt.response_minutes,
  sla_resolve_minutes = tgt.resolve_minutes,
  sla_resolve_by = coalesce(t.due_date, t.created_at + (tgt.resolve_minutes || ' minutes')::interval),
  sla_response_at = t.created_at + (tgt.response_minutes || ' minutes')::interval,
  sla_responded_at = case when t.assignee_id is not null then coalesce(t.sla_responded_at, t.created_at) else t.sla_responded_at end,
  sla_paused_at = case
    when t.status in ('waiting', 'hold') then coalesce(t.sla_paused_at, now())
    else t.sla_paused_at
  end,
  due_date = coalesce(t.due_date, t.created_at + (tgt.resolve_minutes || ' minutes')::interval)
from public.sla_agreements a
join public.sla_targets tgt
  on tgt.agreement_id = a.id
where a.account_id = t.account_id
  and tgt.ticket_type = t.type
  and tgt.priority = t.priority
  and a.is_active
  and t.sla_agreement_id is null;

update public.assignment_groups set tier = 'l1' where id in ('99999999-0001-0001-0001-000000000001', '99999999-0001-0001-0001-000000000004', '99999999-0001-0001-0001-000000000009');
update public.assignment_groups set tier = 'l2' where id in ('99999999-0001-0001-0001-000000000003', '99999999-0001-0001-0001-000000000005');
update public.assignment_groups set tier = 'l3' where id = '99999999-0001-0001-0001-000000000006';

update public.assignment_groups
set
  ola_response_minutes = case tier
    when 'l1' then 30
    when 'l2' then 60
    when 'l3' then 120
    else coalesce(ola_response_minutes, 45)
  end,
  ola_resolve_minutes = case tier
    when 'l1' then 240
    when 'l2' then 480
    when 'l3' then 960
    else coalesce(ola_resolve_minutes, 360)
  end
where coalesce(party_kind, 'internal') = 'internal';

update public.tickets
set pending_reason = 'vendor', pending_note = 'ISP Indosat · case 8821'
where title = 'WiFi lantai 2 putus' and status = 'hold';

update public.tickets
set pending_reason = 'customer', pending_note = 'Menunggu foto error printer'
where title = 'Printer offline' and status = 'waiting';

update public.tickets
set pending_reason = 'change_freeze', pending_note = 'Maintenance window Minggu 22:00'
where title = 'PostgreSQL minor patch' and status = 'hold';

update public.tickets
set group_id = '99999999-0001-0001-0001-000000000005', status = 'in_progress', pending_reason = null, pending_note = null
where title = 'Backup gagal semalam'
  and account_id = '55555555-0001-0001-0001-000000000001';

insert into public.ci_classes (id, tenant_id, group_key, slug, label, hint, sort_order, is_system, created_by)
values
  ('dddddddd-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'offering', 'business_service', 'Business service', 'What users consume', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'offering', 'application', 'Application', 'Software product', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'offering', 'service', 'Tech service', 'Runtime app or worker', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'infra', 'server', 'Server', 'Host or VM', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'infra', 'database', 'Database', 'Data store', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'infra', 'storage', 'Storage', 'SAN, NAS, bucket', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'infra', 'network', 'Network', 'Switch, firewall, link', 40, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'infra', 'load_balancer', 'Load balancer', 'Traffic entry', 50, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'infra', 'cluster', 'Cluster', 'HA or Kubernetes', 60, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000a', '11111111-1111-1111-1111-111111111111', 'infra', 'cloud', 'Cloud', 'VPC, instance, PaaS', 70, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000b', '11111111-1111-1111-1111-111111111111', 'edge', 'endpoint', 'Endpoint', 'Laptop or device', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-0001-0001-0001-00000000000c', '11111111-1111-1111-1111-111111111111', 'edge', 'printer', 'Printer', 'Print queue', 20, true, '22222222-2222-2222-2222-222222222222')
on conflict (tenant_id, slug) do nothing;

insert into public.asset_movements (
  id, tenant_id, account_id, asset_id, event_type,
  from_location, to_location, from_assignee, to_assignee,
  from_status, to_status, note, created_at, created_by
)
values
  (
    'eeeeeeee-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'move',
    'Jakarta HQ', 'Lt. 3',
    'Finance', 'Finance',
    'active', 'active',
    'Relokasi ke lantai marketing',
    now() - interval '18 days',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'transfer',
    'Lt. 3', 'Lt. 3',
    'Finance', 'Operations',
    'active', 'active',
    'Mutasi pemakai setelah reorg',
    now() - interval '6 days',
    '33333333-3333-3333-3333-333333333333'
  )
on conflict (id) do nothing;

alter table public.assets disable trigger assets_log_movement;
update public.assets
set location = 'Lt. 3', assigned_to = 'Operations'
where id = 'aaaaaaaa-0001-0001-0001-000000000001';
alter table public.assets enable trigger assets_log_movement;

insert into public.asset_types (id, tenant_id, slug, label, sort_order, is_system, created_by)
values
  ('ffffffff-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'laptop', 'Laptop', 10, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'server', 'Server', 20, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'network', 'Network', 30, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'printer', 'Printer', 40, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'mobile', 'Mobile', 50, true, '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'cctv', 'CCTV', 60, true, '22222222-2222-2222-2222-222222222222')
on conflict (tenant_id, slug) do nothing;

insert into public.integrations (tenant_id, kind, config, is_active, created_by)
values (
  '11111111-1111-1111-1111-111111111111',
  'ai',
  '{"baseUrl":"https://api.groq.com/openai/v1","model":"openai/gpt-oss-20b"}'::jsonb,
  true,
  '22222222-2222-2222-2222-222222222222'
)
on conflict (tenant_id, kind) do update
set config = public.integrations.config || excluded.config
where coalesce(public.integrations.config->>'apiKey', '') = '';

-- Assistant threads are created at runtime per staff user. No demo chats.

update public.tickets
set
  resolved_at = coalesce(resolved_at, created_at + interval '6 hours'),
  sla_responded_at = coalesce(sla_responded_at, created_at + interval '18 minutes')
where status in ('resolved', 'closed');

update public.tickets
set
  workaround = 'Restore last good dump from /backups and rerun pg_dump with --no-sync. Page L3 if WAL gap > 15 minutes.',
  known_error = true
where title = 'Backup gagal semalam';

update public.tickets
set problem_id = (
  select id from public.tickets
  where title = 'Backup gagal semalam' and tenant_id = '11111111-1111-1111-1111-111111111111'
  limit 1
)
where title = 'AC ruang server panas'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

insert into public.knowledge_articles (tenant_id, title, body, category, is_published, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  'VPN disconnect from home — split tunnel check',
  '1. Confirm the user is on the corporate profile, not personal Wi-Fi captive portal.' || E'\n' ||
  '2. Flush DNS, retry with split-tunnel off.' || E'\n' ||
  '3. If cert error, rotate via standard change Renew TLS / VPN cert.',
  'network',
  true,
  '33333333-3333-3333-3333-333333333333'
where not exists (
  select 1 from public.knowledge_articles
  where tenant_id = '11111111-1111-1111-1111-111111111111'
    and title = 'VPN disconnect from home — split tunnel check'
);

update public.tickets
set
  group_id = '99999999-0001-0001-0001-000000000007',
  uc_id = 'b2b2b2b2-0001-0001-0001-000000000001',
  ola_started_at = now() - interval '36 hours',
  ola_resolve_by = now() - interval '6 hours',
  sla_paused_at = null
where title = 'Phishing email masuk'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

update public.tickets
set
  group_id = '99999999-0001-0001-0001-000000000008',
  uc_id = 'b2b2b2b2-0001-0001-0001-000000000002',
  ola_started_at = now() - interval '20 hours',
  ola_resolve_by = now() - interval '4 hours',
  sla_paused_at = null
where title = 'AC ruang server panas'
  and tenant_id = '11111111-1111-1111-1111-111111111111';

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000001',
  t.tenant_id,
  t.id,
  5,
  'Monitor replaced the same day.',
  t.requester_id
from public.tickets t
where t.title = 'Monitor bergaris'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000002',
  t.tenant_id,
  t.id,
  3,
  'Port fixed, but waited too long.',
  t.requester_id
from public.tickets t
where t.title = 'Kabel LAN putus'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.ticket_csat (id, tenant_id, ticket_id, score, comment, created_by)
select
  'c5a7c5a7-0001-0001-0001-000000000003',
  t.tenant_id,
  t.id,
  4,
  'Account ready before start date.',
  t.requester_id
from public.tickets t
where t.title = 'User baru butuh akun'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.uc_credits (
  id, tenant_id, contract_id, ticket_id, group_id, reason, credit_minutes, amount_note, status, created_by
)
select
  'd4d4d4d4-0001-0001-0001-000000000001',
  t.tenant_id,
  'b2b2b2b2-0001-0001-0001-000000000001',
  t.id,
  t.group_id,
  'ola_resolve_breach',
  360,
  'Missed P1 response: service credit 2% of monthly fee.',
  'open',
  '22222222-2222-2222-2222-222222222222'
from public.tickets t
where t.title = 'Phishing email masuk'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.uc_credits (
  id, tenant_id, contract_id, ticket_id, group_id, reason, credit_minutes, amount_note, status, created_by
)
select
  'd4d4d4d4-0001-0001-0001-000000000002',
  t.tenant_id,
  'b2b2b2b2-0001-0001-0001-000000000002',
  t.id,
  t.group_id,
  'ola_resolve_breach',
  120,
  'Availability below 99.5% in a month: 1-day credit.',
  'open',
  '22222222-2222-2222-2222-222222222222'
from public.tickets t
where t.title = 'AC ruang server panas'
  and t.tenant_id = '11111111-1111-1111-1111-111111111111'
on conflict (ticket_id) do nothing;

insert into public.wfm_shift_templates (
  tenant_id, account_id, name, start_local, end_local, days, timezone, created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000001',
  d.name,
  d.start_local::time,
  d.end_local::time,
  d.days,
  'Asia/Jakarta',
  '22222222-2222-2222-2222-222222222222'
from (
  values
    ('Pagi', '08:00', '16:00', '{1,2,3,4,5}'::smallint[]),
    ('Siang', '12:00', '20:00', '{1,2,3,4,5}'::smallint[]),
    ('Malam', '21:00', '05:00', '{1,2,3,4,5,6,7}'::smallint[]),
    ('24 jam', '00:00', '00:00', '{1,2,3,4,5,6,7}'::smallint[])
) as d(name, start_local, end_local, days)
where not exists (
  select 1
  from public.wfm_shift_templates s
  where s.tenant_id = '11111111-1111-1111-1111-111111111111'
    and lower(s.name) = lower(d.name)
);

-- Major incident lab (Bank Nusantara). Distinct from RCA *Backup gagal* / *AC ruang server*.
-- Idempotent: safe on hosted demo (do not db reset).
insert into public.tickets (
  id, tenant_id, account_id, title, description, type, status, priority, category, due_date,
  requester_name, requester_email, requester_id, assignee_id, assignee_name, group_id, created_by
)
values
  (
    '55555555-1001-4001-8001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'WAN Bank Nusantara putus',
    '{"type":"plain","text":"Circuit Indosat HQ down. War room: satu INC payung, tiket cabang sebagai child. Bukan Problem RCA."}',
    'incident', 'in_progress', 'critical', 'network', now() + interval '4 hours',
    'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333', 'Nova Agent',
    '99999999-0001-0001-0001-000000000004',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '55555555-1001-4001-8001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'ATM cabang Senayan offline',
    '{"type":"plain","text":"ATM tidak bisa transaksi. Gejala cabang dari outage WAN HQ."}',
    'incident', 'open', 'high', 'network', now() + interval '8 hours',
    'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444',
    null, null,
    '99999999-0001-0001-0001-000000000004',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '55555555-1001-4001-8001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'Internet teller cabang Kelapa Gading down',
    '{"type":"plain","text":"Counter teller tidak bisa core banking. Child dari major WAN."}',
    'incident', 'open', 'high', 'network', now() + interval '8 hours',
    'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444',
    null, null,
    '99999999-0001-0001-0001-000000000004',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '55555555-1001-4001-8001-000000000004',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'Reset VPN cabang BSD',
    '{"type":"plain","text":"Request reconnect VPN cabang setelah WAN HQ down. Boleh jadi child major."}',
    'request', 'open', 'medium', 'network', now() + interval '2 days',
    'Nova Customer', 'customer@novacrm.app', '44444444-4444-4444-4444-444444444444',
    null, null,
    '99999999-0001-0001-0001-000000000004',
    '33333333-3333-3333-3333-333333333333'
  )
on conflict (id) do nothing;

update public.tickets
set parent_ticket_id = '55555555-1001-4001-8001-000000000001'
where id in (
  '55555555-1001-4001-8001-000000000002',
  '55555555-1001-4001-8001-000000000003',
  '55555555-1001-4001-8001-000000000004'
)
  and tenant_id = '11111111-1111-1111-1111-111111111111'
  and parent_ticket_id is distinct from '55555555-1001-4001-8001-000000000001';

insert into public.ticket_comments (
  id, tenant_id, ticket_id, author_id, created_by, message, kind, meta
)
values
  (
    '55555555-1001-4001-8001-000000000011',
    '11111111-1111-1111-1111-111111111111',
    '55555555-1001-4001-8001-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'War room dibuka. Tiket cabang Senayan, Kelapa Gading, dan request VPN BSD ditautkan sebagai child. Jangan campur dengan panel RCA.',
    'comment',
    '{}'::jsonb
  ),
  (
    '55555555-1001-4001-8001-000000000012',
    '11111111-1111-1111-1111-111111111111',
    '55555555-1001-4001-8001-000000000002',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'ATM Senayan mati. Terkait major WAN HQ, bukan problem terpisah.',
    'comment',
    '{}'::jsonb
  )
on conflict (id) do nothing;


