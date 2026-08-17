# Local laptop test

Operator training (login, tickets, CMDB, portal): [user-guide/README.md](user-guide/README.md).  
Sysadmin console: [OPS.md](OPS.md).

Use this before any VPS/GitHub deploy. Auth, tickets, Kanban, and uploads all need local Docker services plus a local (or hosted) Supabase.

| Process | Port | Command |
| --- | --- | --- |
| Next.js hot reload | **3000** | `npm run local:dev` |
| Docker `next start` | **3001** | `npm run local:deploy` |
| Ops (health + queues) | **3100** | started by either command above, or `npm run ops` |

Both stacks can run together. `local:deploy` takes `:3100` for the Ops container (stops a host Ops process if needed). `local:dev` will not start a second Ops if `:3100` is already listening.

## One-time setup

```bash
cd novacrm
npm run local:setup
```

This will:

1. `npm install`
2. Start Redis + MinIO
3. Start local Supabase (`npx supabase start`)
4. Apply migrations + seed
5. Write `.env.local`

First `supabase start` downloads several Docker images and can take several minutes.

## Run the app (hot reload)

```bash
npm run local:dev
```

Open [http://localhost:3000](http://localhost:3000)

Ops console (sysadmin): [http://127.0.0.1:3100](http://127.0.0.1:3100) — started automatically with `local:dev`, or `npm run ops`.

## Deploy production-like on this laptop

This builds the same Docker image that will go to VPS, without Traefik/HTTPS. It listens on **3001** so `npm run local:dev` can keep using **3000**.

```bash
npm run local:deploy
```

Open [http://localhost:3001](http://localhost:3001) — this is `next start` inside Docker. Ops in that stack: [http://127.0.0.1:3100](http://127.0.0.1:3100).

```bash
APP_PORT=3002 npm run local:deploy   # optional other host port
npm run local:undeploy               # stop Docker app/worker, keep Supabase
npm run local:dev                    # hot reload on :3000
```

Persiapan cutover: [MIGRATE-SERVER.md](MIGRATE-SERVER.md). VPS/Traefik: [DEPLOYMENT.md](DEPLOYMENT.md). To point this laptop at **hosted** Supabase (keep local Redis/MinIO):

```bash
# add DATABASE_URL + cloud URL/anon/service_role to .env.local
npm run hosted:setup
npm run local:dev
```

| Role | Email | Password |
| --- | --- | --- |
| superadmin | `superadmin@novacrm.app` | `NovaCRM!2026` |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| manager | `manager@novacrm.app` | `NovaCRM!2026` |
| supervisor | `spv@novacrm.app` | `NovaCRM!2026` |
| team lead | `lead@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |
| L1 | `sari.l1@novacrm.app` `budi.l1@novacrm.app` `dewi.l1@novacrm.app` | `NovaCRM!2026` |
| L2 | `raka.l2@novacrm.app` | `NovaCRM!2026` |
| L3 | `maya.l3@novacrm.app` | `NovaCRM!2026` |
| On-call | `andi.oncall@novacrm.app` | `NovaCRM!2026` |

WFM desk: [http://localhost:3000/wfm](http://localhost:3000/wfm) — occupancy, roster, skills, on-call, forecast, reviews. Dispatch policy lives on each assignment group.

## What to click through

1. Login as **admin** or **agent** → [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (home). Reports: [http://localhost:3000/reports](http://localhost:3000/reports)
2. Filter **Incidents / Problems / Changes / Requests**, then **Mine / My groups / Unassigned**
3. Open a ticket — number looks like `INC0000005`. Assign to me, change process state, link a **configuration item**
4. New ticket → `/tickets/new` (or ⌘N). Compose page, not a popup. After create, opens the record.
5. Assets: list + filters, **New asset**, CSV import, detail QR / warranty / book value. Type list is editable: on New asset, type a name (CCTV, UPS…) and press +. Detail also records **Move** (lokasi), **Transfer** (pemakai), **Replace** (retire + ganti aset). Demo: switch to **Bank Nusantara** → `AST-1001` Laptop Finance — history Jakarta HQ → Lt. 3, then Finance → Operations.
6. CMDB: Graph view is **per account**. Switch to **Bank Nusantara** for WAN Indosat → FW → core → Lt.2 AP (`10.20.50.0/24` VLAN 50). Sidebar lists IP segments. New CI: site + network role + CIDR/VLAN/gateway. **Add card** di sidebar untuk tipe CI baru (mis. CCTV). Open a CI to add more segments or see impact.
7. Attach a file (MinIO console: [http://localhost:9001](http://localhost:9001))
8. Settings → **Appearance** for **Midnight / Daylight** theme and **EN / ID**. **Integrations**: AI defaults to **Groq (free)**. Create a key at [console.groq.com](https://console.groq.com/keys), paste, **Test connection**. Then click **Tanya AI** on the top bar (or [Assistant](http://localhost:3000/assistant)). Email test inbox: [Mailpit](http://127.0.0.1:54324)
9. Sign out, login as **customer** → [portal](http://localhost:3000/portal). After login the logo splash shows **Copyright by @RoughTechnolgy**. **Catalog** submits a record producer, or **New request** / Ask AI for a freeform ticket (Ask AI asks location, impact, contact — fill the template, then confirm). Track `/portal/{id}`. After resolve/close, **CSAT is required** — catalog / new request / Ask AI stay locked until the requester rates every unrated ticket. After **7 working days** the worker writes **5/5 auto**. **Privacy** is off until admin enables it (Governance → Privacy notice → **Enable on portal**). Public notice: `/privacy` only when enabled.
10. Automation: [Workflows](http://localhost:3000/workflows) → **New flow** → pick **Standard / Normal / Complex**. Canvas supports condition (Yes/No) nodes. Ticket create/status/comment, **machine alert**, and **inbound message** can run BullMQ actions (assign, email, WhatsApp, Telegram, status, asset). Check **Recent runs** on the flow.
    - Auto-create ticket: `POST /api/webhooks/whatsapp` (secret `local-whatsapp-secret`), `/api/webhooks/telegram`, `/api/webhooks/email`, `/api/webhooks/alerts` (Prometheus/Grafana JSON), `/api/webhooks/generic`. Repeat alerts within 24h update the same ticket.
11. Catalog (agent): [http://localhost:3000/catalog](http://localhost:3000/catalog) — items, variable sets, record producer type. Field-by-field guide: [docs/user-guide/catalog-guidance.md](user-guide/catalog-guidance.md)
12. CAB: [http://localhost:3000/cab](http://localhost:3000/cab) — review queue, calendar, approve/reject/defer on the change record
13. Dashboard KPIs + aging; Reports 7/30/90 or custom dates; preview then CSV / Excel / PDF. Vendor / UC queue compares Fortinet vs Indosat (open, OLA/UC breach, avg queue, service credit). CSAT is **required** after resolve/close: the portal locks catalog / new request / Ask AI until the requester rates every open CSAT. If there is no rating after **7 working days** (SLA calendar, default Mon–Fri Asia/Jakarta), the worker writes **5/5 auto**. Email/WhatsApp after resolve links to `/portal/{id}`; staff email still opens `/tickets/{id}`.
14. Governance / UU PDP: [http://localhost:3000/governance](http://localhost:3000/governance) — RoPA, DSAR 30d, breach 72h, privacy notice. Portal Privacy, consent checkboxes, and `/privacy` stay **off** until **Enable on portal**. Then customer: [portal/privacy](http://localhost:3000/portal/privacy).
15. Switch **account** in the sidebar (Internal / Bank Nusantara / Garuda / **All**). Assets + CMDB + tickets are scoped. Manage at [Accounts](http://localhost:3000/accounts)
16. Organization: [http://localhost:3000/org](http://localhost:3000/org) — Internal divisi/unit vs assignment groups. Tickets can queue to a group; filter **My groups**
17. SLA: [http://localhost:3000/sla](http://localhost:3000/sla) — per-account matrix (type × priority) + calendar. Switch to Bank for Gold INC P1 15m/4h. Waiting/hold pauses the clock. New tickets snapshot the agreement. **Underpinning contracts** (UC) for Fortinet / Indosat live on the same page; link them on vendor groups at `/org`.
18. Hold / escalate: open a ticket → **Hold** + reason `Pending vendor` (case number) pauses SLA. **Escalate L2 / L3** queues Internal `L2 Network` / `L3 Infra` and keeps the clock running. Demo: Bank *WiFi lantai 2* (vendor hold); Internal *Backup gagal* already on L2.
19. Users: [http://localhost:3000/users](http://localhost:3000/users) — **New user** (admin) creates a login. **Access** = `customer` / `agent` / `team_lead` / `supervisor` / `manager` / `admin` / `superadmin`. **Level** = L1/L2/L3 from group membership. Admin can **Reset authenticator** and **Reset password** on a profile after an identity check. Password rotation (portal + desk) is **30 days**; expired users can only open the change-password page. Policy: Settings → **Security**. Superadmin: [Tenants](http://localhost:3000/tenants) creates a client workspace + first admin (Internal account, Service Desk L1, office-hours SLA). Set plan, contract end, grace, auto-pause, and **Protected** on the tenant record — lab lock is `is_protected`, not a hardcoded ID. Pause/archive or contract end + grace blocks login. Data is never deleted on expiry.
20. `http://localhost:3000/api/health` should show Redis `up`
21. Sysadmin Ops: [http://127.0.0.1:3100](http://127.0.0.1:3100) — service health, BullMQ queues (`notifications`, `workflows`, `wfm`, `csat`), retry failed jobs. Independent of the desk. Details: [OPS.md](OPS.md). Scale workers: [WORKERS.md](WORKERS.md). Optional: `OPS_TOKEN` + header `x-ops-token`.
22. AI Insights: [http://localhost:3000/insights](http://localhost:3000/insights) — four cards (queue pressure, SLA risk, workforce load, account health). Needs Groq (or another AI plugin) on **Integrations**.
23. WFM: [http://localhost:3000/wfm](http://localhost:3000/wfm) — occupancy, roster, skills, on-call, forecast, reviews (`/wfm/reviews`). Dispatch policy lives on each assignment group.
24. Bulk import: [http://localhost:3000/import](http://localhost:3000/import) — download template → fill → preview → import (manager+).
25. Integrations catalog: Settings → **Integrations**. Built-in slugs include AI, WhatsApp, Telegram, email, Gmail, Exchange, Slack, Teams, Jira, Salesforce, Entra / Google / Okta / SAML SSO, webhook. **Tambah plugin** adds a tenant card. Google / Microsoft / Okta show login buttons on `/login` when `clientId` is set and the same provider is enabled in Supabase Auth. SAML shows **Continue with SAML** when the plugin has an HTTPS SSO URL + IdP signing cert; ACS is `/api/auth/saml/acs`, SP metadata is `/api/auth/saml/metadata`. Optional `allowedDomains` (e.g. `novacrm.app`) JIT-provisions staff; invited emails copy memberships. MFA TOTP is a tenant toggle (Settings → Security), default off; lab cannot enable it. `/login?tenant=novacrm-demo` selects the tenant.

## Useful URLs

- App (dev): http://localhost:3000
- App (Docker): http://localhost:3001
- Tenant backend (lab): http://localhost:3000/api/v1/t/novacrm-demo
- Tenant health: http://localhost:3000/api/v1/t/novacrm-demo/health
- Tenant OpenAPI: http://localhost:3000/api/v1/t/novacrm-demo/openapi.json
- Ops (sysadmin): http://127.0.0.1:3100
- Supabase Studio: http://127.0.0.1:54323
- MinIO console: http://localhost:9001
- Mailpit (ticket + auth email): http://127.0.0.1:54324

## Stop

Ctrl+C in the `local:dev` terminal.

```bash
npm run local:stop
```

That stops local Supabase, Redis, and MinIO.

After a laptop restart, Docker Desktop and `localhost:3000` are down. Start Docker, wait until it is ready, then `npx supabase start` (do **not** `db reset`) and `npm run local:dev`.

New migration on an existing local DB (do **not** `supabase db reset` — it wipes lab data):

```bash
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815130000_itsm_depth.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815140000_wave2_ops.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815150000_ola_parties.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815160000_underpinning_contracts.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815170000_sso_oidc_fields.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815180000_tenant_mfa.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815190000_csat_uc_credits.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250815200000_tenant_platform.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250816110000_password_rotation.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250817120000_csat_auto_timeout.sql
docker exec -i supabase_db_novacrm psql -U postgres -d postgres < supabase/migrations/20250817140000_tenant_administration.sql
```

Then re-run only the new `UPDATE`/`INSERT` at the end of `supabase/seed.sql` if those rows are missing.

## If setup fails

- Start Docker Desktop, then re-run `npm run local:setup`
- Give Docker at least 6 GB RAM; local Supabase pulls several images on first run
- If Postgres version mismatches, check `npx supabase start` output and set `[db] major_version` in `supabase/config.toml` to the version the CLI expects
- Or use a hosted Supabase project: copy `.env.example` → `.env.local`, paste URL + anon + service role, run the SQL files in `supabase/migrations` then `supabase/seed.sql`, then `npm run local:dev`
