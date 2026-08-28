# RBAC

Nine roles. CASL gates the app. Postgres RLS is the real wall. Both must match this matrix.

Helpers: `is_staff()`, `is_delivery_role()`, `is_team_lead_role()`, `is_supervisor_role()`, `is_manager_role()`, `is_tenant_admin()`, `is_superadmin()`.
Account scope: `accessible_account_ids()` — manager+ sees every tenant account; delivery roles and other staff need `account_members`.

| Capability | customer | agent | pm_delivery | dco | team_lead | supervisor | manager | admin | superadmin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Desk tickets | own tickets | ● | ● | ● | ● | ● | ● | ● |
| Assets / CMDB | | ● | | | ● | ● | ● | ● | ● |
| Delivery project read | own account | ● | ● | ● | ● | ● | ● | ● | ● |
| Delivery project / phase write | | | ● | ● | | | ● | ● | ● |
| Work Order write | | | | ● | | | ● | ● | ● |
| Task / activity / WBS write | | ● | | ● | | | ● | ● | ● |
| Delivery publish approval | | | ● | | | | | ● | ● |
| WFM read / own presence / clock-in / my roster / request or accept swap | | ● | | | ● | ● | ● | ● | ● |
| WFM roster write / skills / on-call / shift hours / approve swap / workforce export | | | | | | ● | ● | ● | ● |
| Staff review read (own submitted) | | ● | | | ● | ● | ● | ● | ● |
| Staff review write | | | | | ● | ● | ● | ● | ● |
| Users read | | | | | ● | ● | ● | ● | ● |
| Users create / update (rank-limited) | | | | | | ● | ● | ● | ● |
| SLA write | | | | | | ● | ● | ● | ● |
| Catalog write | | | | | | ● | ● | ● | ● |
| Org / accounts write | | | | | | | ● | ● | ● |
| Import | | | | | | | ● | ● | ● |
| Workflow write | | | | | | | ● | ● | ● |
| Integrations / notification settings | | | | | | | | ● | ● |
| Tenant record | | | | | | | | | ● |
| Portal catalog / privacy / own DSAR | ● | | | | | | | | |

`canAssignRole`: supervisor → customer/agent; manager → customer/agent/PM Delivery/DCO/team lead/supervisor; admin → all except superadmin; superadmin → all. PM Delivery and DCO cannot assign roles.

Staff land on `/dashboard`. Customer lands on `/portal`.
