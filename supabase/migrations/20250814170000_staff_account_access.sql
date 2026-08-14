-- Manager+ can see every tenant account. Agent / lead / supervisor still need membership.
-- Previously only role = 'admin' bypassed membership, so superadmin/manager missed rows
-- and a staff user without account_members could not insert tickets (RLS).

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
            and m.user_id = auth.uid()
        )
      )
  ) scoped;
$$;
