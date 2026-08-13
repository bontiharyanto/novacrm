-- Asset ITAM fields + CMDB impact helpers

alter table public.assets
  add column if not exists warranty_expiry date,
  add column if not exists useful_life_months integer not null default 36,
  add column if not exists residual_value numeric(14, 2) not null default 0;

create index if not exists idx_assets_warranty_expiry
  on public.assets (tenant_id, warranty_expiry)
  where warranty_expiry is not null;

create index if not exists idx_tickets_asset_id
  on public.tickets (tenant_id, asset_id)
  where asset_id is not null;

comment on column public.assets.warranty_expiry is 'Warranty end date; UI alerts within 30 days.';
comment on column public.assets.useful_life_months is 'Straight-line depreciation period.';
comment on column public.assets.residual_value is 'Book value floor for depreciation.';
