# Local laptop test

Use this before any VPS/GitHub deploy. Auth, tickets, Kanban, and uploads all need local Docker services plus a local (or hosted) Supabase.

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

## Deploy production-like on this laptop

This builds the same Docker image that will go to VPS, without Traefik/HTTPS.

```bash
npm run local:deploy
```

That stops `next dev` on port 3000, builds the production image, and starts **app + worker + Redis + MinIO**. Local Supabase stays running.

Open [http://localhost:3000](http://localhost:3000) — this is `next start` inside Docker, not the dev server.

```bash
npm run local:undeploy   # stop containers, keep Supabase
npm run local:dev        # back to hot reload
```

VPS/Traefik: [DEPLOYMENT.md](DEPLOYMENT.md). To point this laptop at **hosted** Supabase (keep local Redis/MinIO):

```bash
# add DATABASE_URL + cloud URL/anon/service_role to .env.local
npm run hosted:setup
npm run local:dev
```

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |

## What to click through

1. Login as **admin** or **agent** → [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (home). Reports: [http://localhost:3000/reports](http://localhost:3000/reports)
2. Filter **Incidents / Problems / Changes / Requests**, then **Mine / My groups / Unassigned**
3. Open a ticket — number looks like `INC0000005`. Assign to me, change process state, link a **configuration item**
4. New ticket → `/tickets/new` (or ⌘N). Compose page, not a popup. After create, opens the record.
5. Assets: list + filters, **New asset**, CSV import, detail QR / warranty / book value. Type list is editable: on New asset, type a name (CCTV, UPS…) and press +. Detail also records **Move** (lokasi), **Transfer** (pemakai), **Replace** (retire + ganti aset). Demo: switch to **Bank Nusantara** → `AST-1001` Laptop Finance — history Jakarta HQ → Lt. 3, then Finance → Operations.
6. CMDB: Graph view is **per account**. Switch to **Bank Nusantara** for WAN Indosat → FW → core → Lt.2 AP (`10.20.50.0/24` VLAN 50). Sidebar lists IP segments. New CI: site + network role + CIDR/VLAN/gateway. **Add card** di sidebar untuk tipe CI baru (mis. CCTV). Open a CI to add more segments or see impact.
7. Attach a file (MinIO console: [http://localhost:9001](http://localhost:9001))
8. Settings → **Integrations**: AI defaults to **Groq (free)**. Create a key at [console.groq.com](https://console.groq.com/keys) (no credit card), paste, **Test connection**. Then open [Assistant](http://localhost:3000/assistant). Email test inbox: [Mailpit](http://127.0.0.1:54324)
9. Sign out, login as **customer** → [portal](http://localhost:3000/portal): **Catalog** to submit a record producer, or **New request** for a freeform ticket, then track `/portal/{id}`
10. Automation: [Workflows](http://localhost:3000/workflows) → **New flow** → pick **Standard / Normal / Complex**. Canvas supports condition (Yes/No) nodes. Ticket create/status/comment, **machine alert**, and **inbound message** can run BullMQ actions (assign, email, WhatsApp, Telegram, status, asset). Check **Recent runs** on the flow.
    - Auto-create ticket: `POST /api/webhooks/whatsapp` (secret `local-whatsapp-secret`), `/api/webhooks/telegram`, `/api/webhooks/email`, `/api/webhooks/alerts` (Prometheus/Grafana JSON), `/api/webhooks/generic`. Repeat alerts within 24h update the same ticket.
11. Catalog (agent): [http://localhost:3000/catalog](http://localhost:3000/catalog) — items, variable sets, record producer type
12. CAB: [http://localhost:3000/cab](http://localhost:3000/cab) — review queue, calendar, approve/reject/defer on the change record
13. Dashboard KPIs + aging; Reports 7/30/90 or custom dates; preview then CSV / Excel / PDF
14. Governance / UU PDP: [http://localhost:3000/governance](http://localhost:3000/governance) — RoPA, DSAR 30d, breach 72h, privacy notice. Customer: [portal/privacy](http://localhost:3000/portal/privacy)
15. Switch **account** in the sidebar (Internal / Bank Nusantara / Garuda). Assets + CMDB + tickets are scoped. Manage at [Accounts](http://localhost:3000/accounts)
16. Organization: [http://localhost:3000/org](http://localhost:3000/org) — Internal divisi/unit vs assignment groups. Tickets can queue to a group; filter **My groups**
17. SLA: [http://localhost:3000/sla](http://localhost:3000/sla) — per-account matrix (type × priority) + calendar. Switch to Bank for Gold INC P1 15m/4h. Waiting/hold pauses the clock. New tickets snapshot the agreement.
18. Hold / escalate: open a ticket → **Hold** + reason `Pending vendor` (case number) pauses SLA. **Escalate L2 / L3** queues Internal `L2 Network` / `L3 Infra` and keeps the clock running. Demo: Bank *WiFi lantai 2* (vendor hold); Internal *Backup gagal* already on L2.
19. Users: [http://localhost:3000/users](http://localhost:3000/users) — **New user** (admin) creates a login. **Access** = admin/agent/customer. **Level** = L1/L2/L3 from group membership. Admin can change role/home unit and add someone to L2/L3.
20. `http://localhost:3000/api/health` should show Redis `up`

## Useful URLs

- App: http://localhost:3000
- Supabase Studio: http://127.0.0.1:54323
- MinIO console: http://localhost:9001
- Mailpit (ticket + auth email): http://127.0.0.1:54324

## Stop

Ctrl+C in the `local:dev` terminal.

```bash
npm run local:stop
```

That stops local Supabase, Redis, and MinIO.

## If setup fails

- Start Docker Desktop, then re-run `npm run local:setup`
- Give Docker at least 6 GB RAM; local Supabase pulls several images on first run
- If Postgres version mismatches, check `npx supabase start` output and set `[db] major_version` in `supabase/config.toml` to the version the CLI expects
- Or use a hosted Supabase project: copy `.env.example` → `.env.local`, paste URL + anon + service role, run the SQL files in `supabase/migrations` then `supabase/seed.sql`, then `npm run local:dev`
