-- Standard change templates for the Change create form (pre-approved, skip CAB).

insert into public.catalog_categories (id, tenant_id, name, slug, description, sort_order, is_active)
values (
  'cccccccc-0001-0001-0001-000000000005',
  '11111111-1111-1111-1111-111111111111',
  'Standard change',
  'standard-change',
  'Pre-approved low-risk changes',
  5,
  true
)
on conflict (id) do nothing;

insert into public.catalog_items (
  id, tenant_id, category_id, variable_set_id, name, slug, short_description, description,
  icon, ticket_type, priority, variables, is_active
)
values
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
    true
  )
on conflict (id) do nothing;
