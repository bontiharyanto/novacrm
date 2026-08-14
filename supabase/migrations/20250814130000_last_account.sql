-- Remember last selected operations account per staff profile.

alter table public.profiles
  add column if not exists last_account_id uuid references public.accounts(id) on delete set null;
