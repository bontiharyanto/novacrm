# NovaCRM

Enterprise ITSM/CRM workspace for multi-tenant support operations. Tickets, assets, CMDB, workforce, notifications, and automation run on Next.js 14, Supabase, Redis/BullMQ, and MinIO.

Repository: [github.com/bontiharyanto/novacrm](https://github.com/bontiharyanto/novacrm)

## What it does

- Intake tickets from the agent desk, catalog, or WhatsApp / Telegram / email / alert webhooks
- Kanban lifecycle with SLA countdown, hold, and L2/L3 escalate
- Notify requester and assignee over WhatsApp, Telegram, and email (BullMQ)
- Assets → movements → CMDB graph and impact
- Workforce (WFM): occupancy, roster, skills, on-call, forecast
- AI Insights (queue pressure, SLA risk, workforce load, account health) and a staff Assistant
- Plugin catalog for AI, mail, chat, and SSO credentials (connection test; full OIDC/SAML login is not wired yet)
- Isolate every table by `tenant_id` with Supabase RLS
- Sysadmin Ops console on `:3100` (health, queues, retry) independent of Next.js

## Roles (RBAC)

Staff land on the desk. Customers land on the portal.

| Role | Home | Scope |
| --- | --- | --- |
| `customer` | `/portal` | Own tickets, catalog, privacy |
| `agent` | `/dashboard` | Desk work on assigned accounts |
| `team_lead` | `/dashboard` | Assign, escalate, read users and WFM |
| `supervisor` | `/dashboard` | SLA, WFM roster, catalog |
| `manager` | `/dashboard` | Accounts, org, users, import, workflows |
| `admin` | `/dashboard` | Tenant settings and integrations |
| `superadmin` | `/dashboard` | Platform — all tenants and roles |

CASL on the frontend; RLS on the backend. Sidebar account filter: one customer account or **All**.

## Stack

- Next.js 14 App Router, React 18, TypeScript, Tailwind, shadcn/ui
- Supabase (Postgres, Auth, RLS, Realtime)
- Redis + BullMQ (`novacrm-notifications`, `novacrm-workflows`, `novacrm-wfm`)
- MinIO presigned uploads
- Docker Compose (laptop production-like on `:3001` + VPS with Traefik)

## Documentation

| Document | Audience |
| --- | --- |
| [User guide (training pack)](docs/user-guide/README.md) | Staff and customers — trainer agenda + participant manual |
| [Administrator sistem](docs/user-guide/admin-system.md) | Admin — tenant setup, users, SLA, integrations |
| [Pengguna (User)](docs/user-guide/user-operator.md) | Agent desk (L1/L2/L3) + customer portal |
| [Team Lead / SPV](docs/user-guide/lead-spv.md) | Queue lead and supervisor |
| [Manager operasi](docs/user-guide/manager-ops.md) | Accounts, org, import, workflows |
| [Superadmin](docs/user-guide/superadmin.md) | Platform tenant record and break-glass |
| [Catalog & record producer](docs/user-guide/catalog-guidance.md) | Supervisor / admin — design catalog items, variables, worked examples |
| [Local laptop setup](docs/LOCAL.md) | Engineers running the demo |
| [Sysadmin Ops](docs/OPS.md) | Health, queues, retries on `:3100` |
| [Workers (BullMQ)](docs/WORKERS.md) | How many workers, how to scale laptop and VPS |
| [RBAC](docs/RBAC.md) | Roles vs CASL vs RLS |
| [Persiapan migrasi server](docs/MIGRATE-SERVER.md) | Akun, secret, DNS, migrasi — sebelum bootstrap |
| [Server cutover](docs/SERVER.md) | Hosted Supabase + VPS checklist |
| [Production deploy](docs/DEPLOYMENT.md) | VPS / Traefik / GHCR |
| [Backup](docs/BACKUP.md) | Dump 02:00 WIB, cek file |
| [Restore](docs/RESTORE.md) | Latihan ke project scratch, cutover |
| [Kesiapan operasional](docs/OPERATIONS.md) | Pilot vs produksi, kuota Free, checklist |

## Getting started (laptop)

Full walkthrough: [docs/LOCAL.md](docs/LOCAL.md)

```bash
git clone https://github.com/bontiharyanto/novacrm.git
cd novacrm
npm run local:setup
npm run local:dev
```

| What | URL |
| --- | --- |
| App (hot reload) | http://localhost:3000 |
| App (Docker `next start`) | http://localhost:3001 |
| Ops (sysadmin) | http://127.0.0.1:3100 |
| Supabase Studio | http://127.0.0.1:54323 |
| MinIO console | http://localhost:9001 |
| Mailpit | http://127.0.0.1:54324 |

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |

Also seeded: `superadmin@` · `manager@` · `spv@` · `lead@novacrm.app` (same password). L1/L2/L3 / on-call: [docs/LOCAL.md](docs/LOCAL.md). Role playbooks: [docs/user-guide/README.md](docs/user-guide/README.md). Demo passwords are for the lab tenant only — they are not shown on the login screen.

`local:setup` starts Redis + MinIO, runs local Supabase, applies migrations/seed, and writes `.env.local`. Docker Desktop must be running.

Production-like on the same laptop (Docker `next start`, no Traefik):

```bash
npm run local:deploy
```

That rebuilds app + worker + Ops. Hot reload can stay on `:3000`. VPS: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Scripts

```bash
npm run local:setup      # first-time laptop
npm run local:dev        # Next.js :3000 + worker + Ops :3100
npm run local:deploy     # Docker app :3001 + worker + Ops :3100
npm run local:undeploy   # stop Docker app/worker/ops
npm run local:stop       # stop Supabase + Redis + MinIO
npm run local:up         # Redis + MinIO only
npm run ops              # Ops console only
npm run worker           # BullMQ workers only
npm run dev              # Next.js only
npm test
npm run build
```

## CI/CD

Push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Test (`tsc` + lint)
2. Multi-arch image to GHCR (`linux/amd64`, `linux/arm64`)
3. SSH deploy, migrations, healthcheck — when `DEPLOY_HOST` is configured

Production compose: `docker-compose.prod.yml` (Traefik, 3 web replicas, worker, Redis, MinIO, daily 02:00 backup). Restore drill: [docs/RESTORE.md](docs/RESTORE.md). Ops is laptop/loopback only — see [docs/OPS.md](docs/OPS.md).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for secrets, VPS bootstrap, and server setup. Daily dump: [docs/BACKUP.md](docs/BACKUP.md). Restore drill: [docs/RESTORE.md](docs/RESTORE.md).

## License

MIT
