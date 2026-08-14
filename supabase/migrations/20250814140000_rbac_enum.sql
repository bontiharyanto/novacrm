-- Expand app_role. New values cannot be used until this transaction commits.
alter type public.app_role add value if not exists 'team_lead';
alter type public.app_role add value if not exists 'supervisor';
alter type public.app_role add value if not exists 'manager';
alter type public.app_role add value if not exists 'superadmin';
