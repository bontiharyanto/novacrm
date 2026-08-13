# NovaCRM

Enterprise ITSM/CRM workspace for multi-tenant support operations. Tickets, assets, CMDB, notifications, and automation run on Next.js 14, Supabase, Redis/BullMQ, and MinIO.

Repository: [github.com/bontiharyanto/novacrm](https://github.com/bontiharyanto/novacrm)

## What it does

- Intake tickets from the agent desk or WhatsApp/Telegram webhooks
- Kanban lifecycle with SLA risk and realtime updates
- Notify requester and assignee over WhatsApp, Telegram, and email
- Track assets and configuration items before linking them into CMDB
- Isolate every table by `tenant_id` with Supabase RLS and role-based access (`admin`, `agent`, `customer`)

## Stack

- Next.js 14 App Router, React 18, TypeScript, Tailwind
- Supabase (Postgres, Auth, RLS, Realtime)
- Redis + BullMQ for notification jobs
- MinIO presigned uploads
- Docker Compose (dev + production with Traefik)

## Getting started (laptop)

Full walkthrough: [docs/LOCAL.md](docs/LOCAL.md)

```bash
git clone https://github.com/bontiharyanto/novacrm.git
cd novacrm
npm run local:setup
npm run local:dev
```

Open http://localhost:3000

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |

`local:setup` starts Redis + MinIO, runs local Supabase, applies migrations/seed, and writes `.env.local`. Docker Desktop must be running.

## Scripts

```bash
npm run local:setup
npm run local:dev
npm run local:stop
npm run local:up
npm run worker
npm run dev
npm test
npm run build
```

## CI/CD

Push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Test (`tsc` + lint)
2. Multi-arch image to GHCR (`linux/amd64`, `linux/arm64`)
3. SSH deploy, migrations, healthcheck — when `DEPLOY_HOST` is configured

Production compose: `docker-compose.prod.yml` (Traefik, 3 web replicas, worker, Redis, MinIO, daily 02:00 backup). Restore with `./scripts/restore.sh YYYYMMDD`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for secrets, VPS bootstrap, backup, and server setup.

## License

MIT
