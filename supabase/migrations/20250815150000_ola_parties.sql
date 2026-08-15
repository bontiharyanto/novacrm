-- OLA counterpart: internal desk vs vendor vs principal, per assignment group.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'group_party_kind') then
    create type public.group_party_kind as enum ('internal', 'vendor', 'principal');
  end if;
end $$;

alter table public.assignment_groups
  add column if not exists party_kind public.group_party_kind not null default 'internal',
  add column if not exists party_name text;

update public.assignment_groups
set party_kind = 'internal'
where party_kind is null;
