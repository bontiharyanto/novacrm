-- Portal tickets stay on the customer account L1 queue. Lead / SPV watch that
-- account — they are not tenant-wide inbox recipients.

insert into public.assignment_groups (
  id, tenant_id, account_id, name, slug, kind, is_active, tier, created_by
)
select
  '99999999-0001-0001-0001-000000000009',
  '11111111-1111-1111-1111-111111111111',
  '55555555-0001-0001-0001-000000000003',
  'Garuda L1',
  'garuda-l1',
  'assignment',
  true,
  'l1',
  '22222222-2222-2222-2222-222222222222'
where exists (
  select 1 from public.accounts a where a.id = '55555555-0001-0001-0001-000000000003'
)
and not exists (
  select 1 from public.assignment_groups g where g.id = '99999999-0001-0001-0001-000000000009'
);

insert into public.account_members (tenant_id, account_id, user_id, role, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  v.account_id,
  v.user_id,
  'member',
  '22222222-2222-2222-2222-222222222222'
from (
  values
    ('55555555-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222224'::uuid),
    ('55555555-0001-0001-0001-000000000002'::uuid, '22222222-2222-2222-2222-222222222224'::uuid),
    ('55555555-0001-0001-0001-000000000003'::uuid, '22222222-2222-2222-2222-222222222224'::uuid),
    ('55555555-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222223'::uuid),
    ('55555555-0001-0001-0001-000000000002'::uuid, '22222222-2222-2222-2222-222222222223'::uuid),
    ('55555555-0001-0001-0001-000000000003'::uuid, '22222222-2222-2222-2222-222222222223'::uuid)
) as v(account_id, user_id)
where exists (select 1 from public.profiles p where p.id = v.user_id)
and exists (select 1 from public.accounts a where a.id = v.account_id)
and not exists (
  select 1 from public.account_members m
  where m.account_id = v.account_id and m.user_id = v.user_id
);

insert into public.assignment_group_members (tenant_id, group_id, user_id, role, created_by)
select
  '11111111-1111-1111-1111-111111111111',
  v.group_id,
  v.user_id,
  v.role::public.assignment_group_member_role,
  '22222222-2222-2222-2222-222222222222'
from (
  values
    ('99999999-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000004'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000009'::uuid, '22222222-2222-2222-2222-222222222224'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000001'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000004'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000009'::uuid, '22222222-2222-2222-2222-222222222223'::uuid, 'lead'),
    ('99999999-0001-0001-0001-000000000009'::uuid, '33333333-3333-3333-3333-333333333334'::uuid, 'member'),
    ('99999999-0001-0001-0001-000000000009'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'member')
) as v(group_id, user_id, role)
where exists (select 1 from public.assignment_groups g where g.id = v.group_id)
and exists (select 1 from public.profiles p where p.id = v.user_id)
and not exists (
  select 1 from public.assignment_group_members m
  where m.group_id = v.group_id and m.user_id = v.user_id
);
