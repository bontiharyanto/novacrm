-- Portal customers may see their own account estate so catalog/Ask AI can recommend from CMDB + assets.
drop policy if exists assets_select_portal on public.assets;
create policy assets_select_portal on public.assets
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'customer'
);

drop policy if exists cmdb_select_portal on public.cmdb_items;
create policy cmdb_select_portal on public.cmdb_items
for select using (
  tenant_id = public.current_tenant_id()
  and account_id = any (public.accessible_account_ids())
  and public.current_app_role() = 'customer'
);

-- Standard IT categories + items for every tenant (idempotent by slug).
insert into public.catalog_categories (id, tenant_id, name, slug, description, sort_order, is_active)
select gen_random_uuid(), t.id, v.name, v.slug, v.description, v.sort_order, true
from public.tenants t
cross join (
  values
    ('Network', 'network', 'LAN, WAN, VPN, and connectivity', 6),
    ('Software', 'software', 'Business applications and approved installs', 3),
    ('Database', 'database', 'Database availability and access', 7),
    ('Datacenter', 'datacenter', 'Power, cooling, rack, and hall facilities', 8)
) as v(name, slug, description, sort_order)
where not exists (
  select 1 from public.catalog_categories c
  where c.tenant_id = t.id and c.slug = v.slug
);

insert into public.catalog_items (
  id, tenant_id, category_id, variable_set_id, name, slug, short_description, description,
  icon, ticket_type, priority, variables, is_active
)
select
  gen_random_uuid(),
  t.id,
  c.id,
  null,
  v.name,
  v.slug,
  v.short_description,
  v.description,
  v.icon,
  v.ticket_type,
  v.priority,
  v.variables::jsonb,
  true
from public.tenants t
join public.catalog_categories c on c.tenant_id = t.id
join (
  values
    (
      'network',
      'LAN / switch down',
      'lan-switch-down',
      'Access or core switch is unreachable',
      'Incident for LAN port, VLAN, or switch outage on a customer CI.',
      'wifi',
      'incident',
      'high',
      '[{"key":"location","label":"Floor / site","type":"text","required":true},{"key":"symptom","label":"What failed","type":"textarea","required":true}]'
    ),
    (
      'network',
      'WAN / internet down',
      'wan-internet-down',
      'Site circuit or internet link is down',
      'Incident for WAN circuit, ISP, or edge firewall path.',
      'wifi',
      'incident',
      'critical',
      '[{"key":"site","label":"Site","type":"text","required":true},{"key":"provider","label":"ISP / circuit","type":"text","required":false}]'
    ),
    (
      'network',
      'VPN cannot connect',
      'vpn-cannot-connect',
      'Remote users cannot reach the corporate VPN',
      'Incident for VPN gateway or client connect failure.',
      'wifi',
      'incident',
      'high',
      '[{"key":"user_count","label":"Who is affected","type":"text","required":true}]'
    ),
    (
      'software',
      'Business application error',
      'app-error',
      'Published application is slow or returning errors',
      'Incident against an application or tech service in CMDB.',
      'app',
      'incident',
      'high',
      '[{"key":"application","label":"Application / CI","type":"text","required":true},{"key":"error","label":"Error or behaviour","type":"textarea","required":true}]'
    ),
    (
      'software',
      'Install approved software',
      'install-approved-software',
      'Request a packaged application on an endpoint',
      'Request after license and CMDB application check.',
      'app',
      'request',
      'medium',
      '[{"key":"application","label":"Application","type":"text","required":true}]'
    ),
    (
      'database',
      'Database unavailable',
      'database-unavailable',
      'Database or listener is down or rejecting connections',
      'Incident for a database CI or DB server asset.',
      'database',
      'incident',
      'critical',
      '[{"key":"database","label":"Database / CI","type":"text","required":true},{"key":"error","label":"Error message","type":"textarea","required":false}]'
    ),
    (
      'database',
      'Database access request',
      'database-access',
      'Read or write access to an existing database',
      'Request scoped to a database CI the account owns.',
      'key',
      'request',
      'medium',
      '[{"key":"database","label":"Database / CI","type":"text","required":true},{"key":"access","label":"Access needed","type":"select","required":true,"options":["Read","Read/write","Owner"]}]'
    ),
    (
      'datacenter',
      'Datacenter facility issue',
      'dc-facility-issue',
      'Power, cooling, or hall access problem',
      'Incident for DC facility impacting hosted servers or storage.',
      'server',
      'incident',
      'high',
      '[{"key":"hall","label":"Hall / rack","type":"text","required":true},{"key":"symptom","label":"Symptom","type":"textarea","required":true}]'
    ),
    (
      'datacenter',
      'Server / rack access',
      'dc-rack-access',
      'Escort or hands-on access to a racked server',
      'Request against a server asset in the customer datacenter.',
      'server',
      'request',
      'medium',
      '[{"key":"server","label":"Server / asset tag","type":"text","required":true},{"key":"window","label":"Preferred window","type":"text","required":false}]'
    )
) as v(category_slug, name, slug, short_description, description, icon, ticket_type, priority, variables)
  on c.slug = v.category_slug
where not exists (
  select 1 from public.catalog_items i
  where i.tenant_id = t.id and i.slug = v.slug
);

-- Bank Nusantara portal estate: software, database, and HQ server so Ask AI
-- can recommend from the customer's own CMDB + assets (network already seeded).
insert into public.assets (
  id, tenant_id, account_id, name, asset_tag, type, brand, model, status, location, assigned_to, created_by
)
select
  v.id,
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000002',
  v.name,
  v.asset_tag,
  v.type,
  v.brand,
  v.model,
  'active',
  v.location,
  v.assigned_to,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    (
      'aaaaaaaa-0001-0001-0001-000000000019'::uuid,
      'Bank App Server HQ',
      'AST-3301',
      'server',
      'Dell',
      'PowerEdge R650',
      'Jakarta HQ',
      'Apps'
    ),
    (
      'aaaaaaaa-0001-0001-0001-000000000020'::uuid,
      'Bank DB Server HQ',
      'AST-3302',
      'server',
      'Dell',
      'PowerEdge R750',
      'Jakarta HQ',
      'Database'
    )
) as v(id, name, asset_tag, type, brand, model, location, assigned_to)
where exists (
  select 1 from public.accounts a
  where a.id = '55555555-0001-0001-0001-000000000002'
)
and not exists (select 1 from public.assets x where x.id = v.id);

insert into public.cmdb_items (
  id, tenant_id, account_id, asset_id, name, type, attributes, relations, created_by
)
select
  v.id,
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000002',
  v.asset_id,
  v.name,
  v.type,
  v.attributes::jsonb,
  '[]'::jsonb,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    (
      'bbbbbbbb-0001-0001-0001-000000000023'::uuid,
      'aaaaaaaa-0001-0001-0001-000000000019'::uuid,
      'bank-core-app',
      'application',
      '{"role":"core-banking","site":"Jakarta HQ"}'
    ),
    (
      'bbbbbbbb-0001-0001-0001-000000000024'::uuid,
      'aaaaaaaa-0001-0001-0001-000000000020'::uuid,
      'bank-core-db',
      'database',
      '{"engine":"postgres","site":"Jakarta HQ"}'
    )
) as v(id, asset_id, name, type, attributes)
where exists (
  select 1 from public.accounts a
  where a.id = '55555555-0001-0001-0001-000000000002'
)
and not exists (select 1 from public.cmdb_items x where x.id = v.id);
