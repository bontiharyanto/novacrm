-- Standard WFM shifts per tenant: Pagi, Siang, Malam, and 1×24 jam.
-- Isolated by tenant_id. Existing names are left untouched.

insert into public.wfm_shift_templates (
  tenant_id,
  account_id,
  name,
  start_local,
  end_local,
  days,
  timezone,
  is_active,
  created_by
)
select
  t.id,
  a.id,
  d.name,
  d.start_local::time,
  d.end_local::time,
  d.days,
  coalesce(nullif(t.timezone, ''), 'Asia/Jakarta'),
  true,
  t.created_by
from public.tenants t
cross join (
  values
    ('Pagi', '08:00', '16:00', '{1,2,3,4,5}'::smallint[]),
    ('Siang', '12:00', '20:00', '{1,2,3,4,5}'::smallint[]),
    ('Malam', '21:00', '05:00', '{1,2,3,4,5,6,7}'::smallint[]),
    ('24 jam', '00:00', '00:00', '{1,2,3,4,5,6,7}'::smallint[])
) as d(name, start_local, end_local, days)
left join lateral (
  select id
  from public.accounts
  where tenant_id = t.id
  order by case when type = 'internal' then 0 else 1 end, created_at
  limit 1
) a on true
where not exists (
  select 1
  from public.wfm_shift_templates s
  where s.tenant_id = t.id
    and lower(s.name) = lower(d.name)
);
