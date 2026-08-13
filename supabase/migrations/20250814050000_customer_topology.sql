-- Per-account network topology for customer desks (Bank Nusantara, Garuda Logistics).
-- Relations stay inside the same account; Internal graph is unchanged.

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
  (
    'bbbbbbbb-0001-0001-0001-000000000013',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    null,
    'bank-wan-indosat',
    'network',
    '{"role":"wan","site":"Jakarta HQ","circuit":"Indosat 100M"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000014',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000011',
    'bank-fw-hq',
    'network',
    '{"role":"edge","site":"Jakarta HQ"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000015',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000012',
    'bank-core-sw',
    'network',
    '{"role":"core","site":"Jakarta HQ"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000016',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000013',
    'bank-acc-lt2',
    'network',
    '{"role":"access","site":"Jakarta HQ","floor":"2"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000017',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000014',
    'bank-acc-lt3',
    'network',
    '{"role":"access","site":"Jakarta HQ","floor":"3"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000018',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000015',
    'bank-ap-lt2',
    'network',
    '{"role":"ap","site":"Jakarta HQ","ssid":"BN-Corp","floor":"2"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000019',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000003',
    null,
    'garuda-wan-xl',
    'network',
    '{"role":"wan","site":"Gudang","circuit":"XL 50M"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000020',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000016',
    'garuda-fw',
    'network',
    '{"role":"edge","site":"Gudang"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000021',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000017',
    'garuda-sw-wh',
    'network',
    '{"role":"access","site":"Gudang"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000022',
    '11111111-1111-1111-1111-111111111111',
    '55555555-0001-0001-0001-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000018',
    'garuda-ap-wh',
    'network',
    '{"role":"ap","site":"Gudang","ssid":"GL-WH"}'::jsonb,
    '[]'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000014","type":"connects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000013';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000015","type":"protects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000014';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000016","type":"connects"},{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"connects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000015';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000018","type":"connects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000016';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000020","type":"connects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000019';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000021","type":"protects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000020';
update public.cmdb_items
set relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000022","type":"connects"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000021';

update public.cmdb_items
set
  attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ","floor":"3"}'::jsonb,
  relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000008';

update public.cmdb_items
set
  attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ","owner":"finance"}'::jsonb,
  relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000017","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000009';

update public.cmdb_items
set
  attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Jakarta HQ","owner":"ops"}'::jsonb,
  relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000018","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000010';

update public.cmdb_items
set
  attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Gudang"}'::jsonb,
  relations = '[{"targetId":"bbbbbbbb-0001-0001-0001-000000000021","type":"uses"}]'::jsonb
where id = 'bbbbbbbb-0001-0001-0001-000000000011';

update public.cmdb_items
set
  attributes = coalesce(attributes, '{}'::jsonb) || '{"site":"Gudang","owner":"sales"}'::jsonb,
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

update public.tickets
set asset_id = 'aaaaaaaa-0001-0001-0001-000000000015'
where title = 'WiFi lantai 2 putus'
  and account_id = '55555555-0001-0001-0001-000000000002'
  and asset_id is null;
