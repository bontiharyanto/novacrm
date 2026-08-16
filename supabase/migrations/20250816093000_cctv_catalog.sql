-- CCTV catalog + asset type for every tenant (idempotent by slug).
insert into public.catalog_categories (id, tenant_id, name, slug, description, sort_order, is_active)
select gen_random_uuid(), t.id, 'CCTV', 'cctv', 'Cameras, NVR/DVR, and footage requests', 9, true
from public.tenants t
where not exists (
  select 1 from public.catalog_categories c
  where c.tenant_id = t.id and c.slug = 'cctv'
);

insert into public.asset_types (id, tenant_id, slug, label, sort_order, is_system, created_by)
select gen_random_uuid(), t.id, 'cctv', 'CCTV', 60, true, null
from public.tenants t
where not exists (
  select 1 from public.asset_types a
  where a.tenant_id = t.id and a.slug = 'cctv'
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
join public.catalog_categories c
  on c.tenant_id = t.id and c.slug = 'cctv'
cross join (
  values
    (
      'CCTV camera offline',
      'cctv-camera-offline',
      'Camera is down, black, or not recording',
      'Incident for a camera CI or CCTV asset. Ticket can still be opened if the camera is not yet in CMDB.',
      'cctv',
      'incident',
      'high',
      '[{"key":"location","label":"Location / camera name","type":"text","required":true},{"key":"symptom","label":"What failed","type":"textarea","required":true}]'
    ),
    (
      'CCTV image quality',
      'cctv-image-quality',
      'Blur, night vision, or wrong angle',
      'Incident for picture quality on an existing or unlisted camera.',
      'cctv',
      'incident',
      'medium',
      '[{"key":"location","label":"Location / camera name","type":"text","required":true},{"key":"symptom","label":"Quality issue","type":"textarea","required":true}]'
    ),
    (
      'NVR / recorder down',
      'cctv-nvr-down',
      'NVR, DVR, or VMS cannot record or play back',
      'Incident against a recorder CI. Open even if the NVR is not in the account estate.',
      'cctv',
      'incident',
      'critical',
      '[{"key":"recorder","label":"NVR / site","type":"text","required":true},{"key":"symptom","label":"Symptom","type":"textarea","required":true}]'
    ),
    (
      'Request CCTV footage',
      'cctv-footage-request',
      'Export playback for a time window',
      'Request scoped to a camera or site. Desk verifies policy before export.',
      'cctv',
      'request',
      'medium',
      '[{"key":"location","label":"Camera / site","type":"text","required":true},{"key":"window","label":"Date and time window","type":"text","required":true},{"key":"reason","label":"Business reason","type":"textarea","required":true}]'
    ),
    (
      'Install new CCTV',
      'cctv-install',
      'Add a camera that is not yet in the estate',
      'Request to survey, install, and register a new CCTV asset and CI.',
      'cctv',
      'request',
      'medium',
      '[{"key":"location","label":"Proposed location","type":"text","required":true},{"key":"reason","label":"Why it is needed","type":"textarea","required":true}]'
    )
) as v(name, slug, short_description, description, icon, ticket_type, priority, variables)
where not exists (
  select 1 from public.catalog_items i
  where i.tenant_id = t.id and i.slug = v.slug
);
