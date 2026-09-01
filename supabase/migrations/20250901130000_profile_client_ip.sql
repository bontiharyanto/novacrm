-- Workstation IP for subnet-based GAMAS impact detection.

alter table public.profiles
  add column if not exists client_ip text;

comment on column public.profiles.client_ip is
  'Optional IPv4 of the portal user workstation. Matched against CMDB IP segments on affected CIs.';
