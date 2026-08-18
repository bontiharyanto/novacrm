# RBAC

Seven roles. CASL gates the app. Postgres RLS is the real wall. Both must match this matrix.

Helpers: `is_staff()`, `is_team_lead_role()`, `is_supervisor_role()`, `is_manager_role()`, `is_tenant_admin()`, `is_superadmin()`.  
Account scope: `accessible_account_ids()` — manager+ sees every tenant account; others need `account_members`.

| Capability | customer | agent | team_lead | supervisor | manager | admin | superadmin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Desk tickets / assets / CMDB | own tickets | ● | ● | ● | ● | ● | ● |
| WFM read / own presence / clock-in / my roster / request or accept swap | | ● | ● | ● | ● | ● | ● |
| WFM roster write / skills / on-call / approve swap / coverage report | | | | ● | ● | ● | ● |
| Staff review read (own submitted) | | ● | ● | ● | ● | ● | ● |
| Staff review write | | | ● | ● | ● | ● | ● |
| Users read | | | ● | ● | ● | ● | ● |
| Users create / update (rank-limited) | | | | ● | ● | ● | ● |
| SLA write | | | | ● | ● | ● | ● |
| Catalog write | | | | ● | ● | ● | ● |
| Org / accounts write | | | | | ● | ● | ● |
| Import | | | | | ● | ● | ● |
| Workflow write | | | | | ● | ● | ● |
| Integrations / notification settings | | | | | | ● | ● |
| Tenant record | | | | | | | ● |
| Portal catalog / privacy / own DSAR | ● | | | | | | |

`canAssignRole`: supervisor → customer/agent; manager → up to supervisor; admin → not superadmin; superadmin → all.

Staff land on `/dashboard`. Customer lands on `/portal`.
