# Production deploy

Laptop first: [LOCAL.md](LOCAL.md). Sysadmin console (laptop): [OPS.md](OPS.md). Cutover checklist: [SERVER.md](SERVER.md). Roles: [RBAC.md](RBAC.md).

**Order:** create Supabase project → `npm run hosted:setup` → fill `.env.production` on the VPS → DNS → GitHub secrets → push `main`.

## 1. Hosted Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL**, **anon key**, and **service_role** key (Settings → API).
3. Copy the **URI** connection string (Settings → Database). Use the session pooler or direct `db.<ref>.supabase.co:5432` URI. Prefer a password without quotes.
4. On your laptop, put those values in `.env.local` (keep local Redis/MinIO URLs) **or** in `.env.production`, then:

```bash
cd novacrm
npm run hosted:setup
```

That applies `supabase/migrations/*.sql`, seed data, and demo logins:

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |

Smoke-test against hosted Auth while still on the laptop: set `NEXT_PUBLIC_SUPABASE_*` / `NOVACRM_SUPABASE_*` in `.env.local` to the cloud project, then `npm run local:dev`.

## 2. DNS

Point both names at the VPS:

- `crm.example.com` → app (Traefik / Let's Encrypt)
- `files.crm.example.com` → MinIO (presigned uploads)

## 3. VPS bootstrap

Docker + git on Ubuntu/Debian. Then:

```bash
sudo mkdir -p /opt/novacrm
sudo git clone https://github.com/bontiharyanto/novacrm.git /opt/novacrm
cd /opt/novacrm
cp .env.production.example .env.production
# fill real Supabase keys, DATABASE_URL, MinIO passwords, APP_HOST, MINIO_PUBLIC_HOST, ACME_EMAIL
```

Compose interpolates `APP_HOST`, `MINIO_PUBLIC_HOST`, and `ACME_EMAIL` from a project `.env` file. `npm run prod:bootstrap` writes that file from `.env.production` if missing.

```bash
chmod +x scripts/*.sh
npm run prod:bootstrap
```

Or equivalently:

```bash
sh scripts/check-prod-env.sh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans --scale web=3
DATABASE_URL='postgresql://...' sh scripts/migrate.sh
```

Open `https://crm.example.com/api/health` — Redis must be `up`. Then login as admin.

Change MinIO and demo passwords after first login. Do not ship `minioadmin`.

## 4. GitHub Actions

Workflow: `.github/workflows/deploy.yml`

- Pull request: test only
- Push to `main` or **Run workflow**: test → multi-arch GHCR (local Inter / JetBrains fonts — no Google Fonts during `linux/arm64` build) → SSH deploy when `DEPLOY_HOST` is set
- Compose on the VPS pins `IMAGE_TAG` to the git SHA that just published
- `scripts/migrate.sh` records each file in `public.schema_migrations` and skips repeats. Existing databases: `MIGRATE_STAMP=1 sh scripts/migrate.sh`

Image: `ghcr.io/bontiharyanto/novacrm`

```bash
gh secret set DEPLOY_HOST --body "vps.example.com"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
gh secret set DEPLOY_PATH --body "/opt/novacrm"
gh secret set DATABASE_URL --body "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
```

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | VPS hostname |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | `/opt/novacrm` |
| `DATABASE_URL` | Hosted Postgres for `scripts/migrate.sh` |

Without `DEPLOY_HOST`, CI still publishes GHCR and skips SSH. The VPS must already have `.env.production`.

Make the GHCR package public, or leave the deploy job’s `docker login ghcr.io` in place so the server can pull.

## 5. Runtime

- Web: Next.js, `--scale web=3`, Traefik TLS
- Worker: BullMQ — `novacrm-notifications`, `novacrm-workflows`, `novacrm-wfm`. Default **1** replica. Add a second with `--scale worker=2` — [WORKERS.md](WORKERS.md)
- DB: hosted Supabase (Auth + Postgres + Realtime)
- Queue: Redis
- Files: MinIO at `files.<APP_HOST>`, CORS allowed from the app origin
- Public Supabase URL/anon key come from `.env.production` (`NOVACRM_SUPABASE_*`) so one image works per environment
- Ops (`:3100`) is **not** published by `docker-compose.prod.yml`. Use it on the laptop, or add a loopback-only service with `OPS_TOKEN` if you need it on the VPS

Email in production needs `RESEND_API_KEY`. Without it, outbound mail is logged as failed (no local sink). After pull, `migrate.sh` applies only **new** SQL files (RBAC, WFM, insights, plugins, account access).

## 6. Backup

Daily 02:00 Asia/Jakarta inside the `backup` service.

- Postgres: `pg_dump` → `/backups/novacrm-YYYYMMDD.sql.gz`
- MinIO → R2/S3 when `BACKUP_S3_*` is set
- Retention: 7 days

```bash
./scripts/backup.sh
./scripts/restore.sh 20260813
```

## Health

`GET /api/health` → `{ data, error }`. 503 if Supabase env or Redis is missing. Traefik and Compose use this path.
