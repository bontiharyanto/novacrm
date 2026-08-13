# Deployment Guide

NovaCRM production path: GitHub Actions tests, builds a multi-arch image to GHCR, then SSH-deploys `docker-compose.prod.yml` when server secrets exist.

Local laptop first: [docs/LOCAL.md](LOCAL.md).

## Runtime

- Web: Next.js (3 replicas behind Traefik)
- Worker: BullMQ notification processor
- Database: hosted Supabase Postgres
- Queue: Redis
- Files: MinIO, uploaded with presigned URLs
- Edge: Traefik + Let's Encrypt

Public Supabase URL/anon key are injected at **runtime** from `.env.production`, so one GHCR image works for any tenant project.

## GitHub Actions

Workflow: `.github/workflows/deploy.yml`

- Pull request: test only
- Push to `main` or manual **Run workflow**: test → build/push GHCR → SSH deploy if secrets exist

Image: `ghcr.io/bontiharyanto/novacrm`

### Required repository secrets for SSH

Set these in GitHub → Settings → Secrets and variables → Actions:

```bash
gh secret set DEPLOY_HOST --body "vps.example.com"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
gh secret set DEPLOY_PATH --body "/opt/novacrm"
gh secret set DATABASE_URL --body "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
```

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Production server hostname |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | App directory on the server, e.g. `/opt/novacrm` |
| `DATABASE_URL` | Postgres URL for `scripts/migrate.sh` |

Without `DEPLOY_HOST`, the deploy job is skipped and only GHCR is updated. `GITHUB_TOKEN` is provided by Actions and is used to push/pull `ghcr.io/bontiharyanto/novacrm`.

## Server bootstrap

On the VPS (Docker + git installed):

```bash
sudo mkdir -p /opt/novacrm
sudo git clone https://github.com/bontiharyanto/novacrm.git /opt/novacrm
cd /opt/novacrm
cp .env.production.example .env.production
# fill production values, including hosted Supabase keys

cat > .env <<'EOF'
APP_HOST=crm.example.com
ACME_EMAIL=ops@example.com
IMAGE_TAG=latest
EOF

# Point DNS A/AAAA for APP_HOST at this server, then:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans --scale web=3
```

Create a hosted [Supabase](https://supabase.com) project, run `supabase/migrations/*.sql` then `supabase/seed.sql` (or let CI `migrate.sh` apply migrations).

After secrets are set, the next push to `main` will pull the new image, scale web to 3, migrate, and healthcheck `/api/health`.

## Environment

Copy `.env.production.example` to `.env.production`. Minimum production keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=novacrm
WHATSAPP_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_SECRET=
DATABASE_URL=
```

Compose interpolates `APP_HOST` and `ACME_EMAIL` from the project `.env` file (not `.env.production`).

## Backup and restore

Backup cron runs daily at 02:00 Asia/Jakarta.

- Postgres: `pg_dump` → `/backups/novacrm-YYYYMMDD.sql.gz`
- MinIO: `mc mirror` to R2/S3 when `BACKUP_S3_*` is set
- Retention: 7 daily files

```bash
./scripts/backup.sh
./scripts/restore.sh 20260813
```

## Healthcheck

`GET /api/health` returns `{ data, error }` including Redis status. Traefik and Compose use this path for load-balancer health.

## Local Docker

Laptop loop uses Redis + MinIO only, plus local Supabase:

```bash
npm run local:setup
npm run local:dev
```
