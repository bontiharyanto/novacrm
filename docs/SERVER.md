# Server migration checklist

Prepare accounts and secrets first: [MIGRATE-SERVER.md](MIGRATE-SERVER.md). Then use this page to cut over. Laptop: [LOCAL.md](LOCAL.md). Secrets/Compose: [DEPLOYMENT.md](DEPLOYMENT.md). Roles: [RBAC.md](RBAC.md).

## What goes where

| Piece | Laptop | Server |
| --- | --- | --- |
| App | `:3000` hot reload / `:3001` Docker | Traefik HTTPS, 3× `web` |
| Worker | `npm run worker` | Compose `worker` (notifications + workflows + WFM). Scale: [WORKERS.md](WORKERS.md) |
| Ops | `:3100` loopback | Not published. Add later with `OPS_TOKEN` if needed |
| Postgres / Auth | `npx supabase start` | Hosted Supabase |
| Redis / MinIO | Compose on the laptop | Compose on the VPS |
| Migrations | applied by `local:setup` | `scripts/migrate.sh` (tracked in `schema_migrations`) |

Image: `ghcr.io/bontiharyanto/novacrm:<git-sha>` and `:latest`.

## 1. Hosted Supabase (once)

1. Create the project. Copy URL, anon, service_role, and the **session pooler** `DATABASE_URL`.
2. From the laptop (never commit these files):

```bash
# .env.local or .env.production — hosted keys, keep local Redis/MinIO URLs for smoke test
npm run hosted:setup
```

That runs every file in `supabase/migrations` **once**, then seed + demo logins.

3. Point the laptop at hosted Auth and confirm login still works (`npm run local:dev`).
4. Change the demo password after the first successful admin login.

If the project already has the schema (you applied SQL in the dashboard), stamp instead of re-running:

```bash
DATABASE_URL='postgresql://...' MIGRATE_STAMP=1 sh scripts/migrate.sh
```

## 2. DNS

- `APP_HOST` (example `crm.example.com`) → VPS A/AAAA
- `MINIO_PUBLIC_HOST` (example `files.crm.example.com`) → same VPS

Wait until both names resolve before the first Traefik up.

## 3. VPS

```bash
sudo mkdir -p /opt/novacrm
sudo git clone https://github.com/bontiharyanto/novacrm.git /opt/novacrm
cd /opt/novacrm
cp .env.production.example .env.production
# fill hosted Supabase, DATABASE_URL, MinIO users, APP_HOST, MINIO_PUBLIC_HOST, ACME_EMAIL
chmod +x scripts/*.sh
npm run prod:check
npm run prod:bootstrap
```

`prod:bootstrap` pulls GHCR, starts web×3 + worker + Redis + MinIO, runs `migrate.sh`, waits for `/api/health`.

Do **not** ship `minioadmin`. Do **not** run `seed.sql` on a tenant that already has production data.

## 4. GitHub Actions

```bash
gh secret set DEPLOY_HOST --body "vps.example.com"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
gh secret set DEPLOY_PATH --body "/opt/novacrm"
gh secret set DATABASE_URL --body "postgresql://postgres:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"
```

Push to `main`: Test → multi-arch GHCR (amd64 + arm64, **local fonts**, no Google Fonts fetch) → SSH pull of `IMAGE_TAG=$GITHUB_SHA` → migrate (skips already-applied files) → health.

Without `DEPLOY_HOST` the SSH job is skipped; GHCR still publishes.

Make the GHCR package public, or keep `docker login ghcr.io` on the VPS (the workflow already logs in).

## 5. After cutover

- [ ] `https://$APP_HOST/api/health` → Redis `up`
- [ ] Admin login, then rotate demo passwords
- [ ] Settings → Integrations (Groq / mail) — do not reuse classroom keys
- [ ] Webhook secrets rotated (`WHATSAPP_WEBHOOK_SECRET`, …) — send as `x-webhook-secret` header only, never `?secret=`
- [ ] MinIO CORS allows `https://$APP_HOST`
- [ ] Backup: `./scripts/backup.sh` once; confirm 02:00 cron
- [ ] Restore drill: `./scripts/restore.sh YYYYMMDD` on a scratch project

## 6. Rollback

```bash
cd /opt/novacrm
# previous image
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d --scale web=3
# If you run two workers, add: --scale worker=2  (see WORKERS.md)
```

SQL is forward-only. Restore Postgres from the daily dump if a migration must be undone.

## Migrations in this cutover

Apply in filename order (migrate.sh does this):

- Foundation through governance / catalog / SLA / org / accounts
- `20250814110000_assistant_threads.sql`
- `20250814120000_wfm.sql`
- `20250814130000_last_account.sql`
- `20250814140000_rbac_enum.sql` + `20250814140100_rbac.sql`
- `20250814150000_ai_insights.sql`
- `20250814160000_integration_plugins.sql` + `20250814161000_sso_mail_plugins.sql`
- `20250814170000_staff_account_access.sql`
- `20250814171000_align_rbac_policies.sql`
- `20250814180000_standard_change_catalog.sql`
- `20250815130000_itsm_depth.sql` (problem link, knowledge, resolved_at)
- `20250815140000_wave2_ops.sql` (ticket audit, group OLA)
- `20250815150000_ola_parties.sql` (vendor / principal on assignment groups)
- `20250815160000_underpinning_contracts.sql` (formal UC + targets, group/ticket `uc_id`)
- `20250815170000_sso_oidc_fields.sql` (SSO allowedDomains + defaultRole)
- `20250815180000_tenant_mfa.sql` (tenant MFA toggle, default off)
- `20250815190000_csat_uc_credits.sql` (CSAT after resolve + UC service credits)
- `20250817120000_csat_auto_timeout.sql` (CSAT 5/5 auto after 7 working days)
- `20250817140000_tenant_administration.sql` (plan, contract end, grace, auto-pause, protected flag)
- `20250815200000_tenant_platform.sql` (superadmin tenant list/create/pause)
- `20250815300000_staff_reviews.sql` (staff reviews under WFM)
- `20250815310000_staff_review_ai.sql` (advisory AI scores on a review)
- `20250815320000_assistant_threads_staff.sql` (Nova Agent threads for all staff)
