-- Defense in depth for account-scoped access.
-- Membership rows must belong to the same tenant as the account they unlock.

create or replace function public.accessible_account_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(id), '{}'::uuid[])
  from (
    select a.id
    from public.accounts a
    where a.tenant_id = public.current_tenant_id()
      and (
        public.is_manager_role()
        or exists (
          select 1
          from public.account_members m
          where m.account_id = a.id
            and m.tenant_id = a.tenant_id
            and m.user_id = auth.uid()
        )
      )
  ) scoped;
$$;

