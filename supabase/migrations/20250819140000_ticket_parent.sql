-- Major incident: one parent ticket, many child incidents/requests. One level only.

alter table public.tickets
  add column if not exists parent_ticket_id uuid references public.tickets(id) on delete set null;

create index if not exists idx_tickets_parent
  on public.tickets (tenant_id, parent_ticket_id)
  where parent_ticket_id is not null;

create or replace function public.enforce_ticket_parent()
returns trigger
language plpgsql
as $$
declare
  parent_row public.tickets;
begin
  if exists (
    select 1
    from public.tickets
    where parent_ticket_id = new.id
      and tenant_id = new.tenant_id
  ) then
    if new.type <> 'incident' then
      raise exception 'A parent ticket must remain an incident';
    end if;
    if new.parent_ticket_id is not null then
      raise exception 'A parent ticket cannot become a child';
    end if;
  end if;

  if new.parent_ticket_id is null then
    return new;
  end if;
  if new.parent_ticket_id = new.id then
    raise exception 'A ticket cannot be its own parent';
  end if;
  select * into parent_row
  from public.tickets
  where id = new.parent_ticket_id
    and tenant_id = new.tenant_id;
  if not found then
    raise exception 'Parent ticket was not found';
  end if;
  if parent_row.parent_ticket_id is not null then
    raise exception 'Parent ticket cannot itself be a child';
  end if;
  if parent_row.type <> 'incident' then
    raise exception 'Parent must be an incident';
  end if;
  if new.type not in ('incident', 'request') then
    raise exception 'Only incidents and requests can be children';
  end if;
  if exists (
    select 1
    from public.tickets
    where parent_ticket_id = new.id
      and tenant_id = new.tenant_id
  ) then
    raise exception 'A parent ticket cannot become a child';
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_enforce_parent on public.tickets;
create trigger tickets_enforce_parent
before insert or update of parent_ticket_id, type on public.tickets
for each row execute function public.enforce_ticket_parent();

comment on column public.tickets.parent_ticket_id is
  'Major-incident parent. Children are other incidents/requests in the same tenant. Distinct from problem_id (RCA).';
