-- Tenant brand logo (MinIO object key under {tenant_id}/…).

alter table public.tenants
  add column if not exists logo_object_key text;

comment on column public.tenants.logo_object_key is
  'MinIO object key for tenant logo (PNG/JPEG/WebP/SVG). Null = default Nova mark.';
