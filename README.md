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

## Getting started

```bash
git clone https://github.com/bontiharyanto/novacrm.git
cd novacrm
npm install
cp .env.example .env.local
```

Apply `supabase/migrations/*.sql` then `supabase/seed.sql` on your Supabase project. Start local dependencies and the app:

```bash
docker compose up redis minio minio-init
npm run worker
npm run dev
```

Open http://localhost:3000

Demo logins (password `NovaCRM!2026`) after seed:

- `admin@novacrm.app`
- `agent@novacrm.app`
- `customer@novacrm.app`

## Scripts

```bash
npm run dev
npm run worker
npm test
npm run build
npm run start
npm run lint
```

## CI/CD

Push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Test (`tsc` + lint)
2. Multi-arch image to GHCR (`linux/amd64`, `linux/arm64`)
3. SSH deploy, migrations, healthcheck — when `DEPLOY_HOST` is configured

Production compose: `docker-compose.prod.yml` (Traefik, 3 web replicas, worker, Redis, MinIO, daily 02:00 backup). Restore with `./scripts/restore.sh YYYYMMDD`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for secrets, backup, and server setup.

## License

MIT
