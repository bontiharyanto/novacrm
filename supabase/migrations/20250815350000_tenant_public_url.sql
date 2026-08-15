-- Per-tenant public URL for notification links (CSAT, portal, desk). Admin sets it in Settings → Notifications.

alter table public.tenants
  add column if not exists public_url text;

comment on column public.tenants.public_url is 'Public base URL used in outbound notification links. Example https://desk.acme.id';

update public.tenants
set public_url = 'http://localhost:3000'
where id = '11111111-1111-1111-1111-111111111111'
  and coalesce(public_url, '') = '';

notify pgrst, 'reload schema';
