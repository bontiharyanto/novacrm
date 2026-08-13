# Deployment Guide

NovaCRM production path: GitHub Actions builds a multi-arch image to GHCR, then SSH-deploys `docker-compose.prod.yml`.

## Runtime

- Web: Next.js (3 replicas behind Traefik)
- Worker: BullMQ notification processor
- Database: Supabase Postgres
- Queue: Redis
- Files: MinIO, uploaded with presigned URLs
- Edge: Traefik + Let's Encrypt

## GitHub Actions

Workflow: `.github/workflows/deploy.yml`

On pull request: test only. On push to `main`: test, build/push GHCR, deploy if SSH secrets exist.

### Required repository secrets

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Production server hostname |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | App directory on the server, e.g. `/opt/novacrm` |
| `DATABASE_URL` | Postgres URL for `scripts/migrate.sh` |

`GITHUB_TOKEN` is provided by Actions and is used to push `ghcr.io/bontiharyanto/novacrm`.

## Server bootstrap

```bash
git clone https://github.com/bontiharyanto/novacrm.git /opt/novacrm
cd /opt/novacrm
cp .env.example .env.production
# fill production values
docker compose -f docker-compose.prod.yml up -d
```

Set `APP_HOST` and `ACME_EMAIL` in the environment used by Compose. Point DNS at the server.

Scale web replicas (Swarm or Compose scale):

```bash
docker compose -f docker-compose.prod.yml up -d --scale web=3
```

## Environment

Copy `.env.example` to `.env.production`. Minimum production keys:

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

```bash
docker compose up --build
```

This starts the app, Redis, MinIO, and the notification worker.
