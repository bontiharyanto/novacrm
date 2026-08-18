# Go-live VPS — `novacrm.click`

Runbook instance yang **sudah jalan**: Ubuntu VPS + Traefik + image GHCR + Supabase hosted.

Lab laptop tetap: [LOCAL.md](LOCAL.md). Checklist umum: [MIGRATE-SERVER.md](MIGRATE-SERVER.md), [SERVER.md](SERVER.md), [DEPLOYMENT.md](DEPLOYMENT.md). Cadangan 02:00: [BACKUP.md](BACKUP.md). Restore: [RESTORE.md](RESTORE.md). Kesiapan operasional (pilot vs produksi): [OPERATIONS.md](OPERATIONS.md).

Jangan `supabase db reset`. Jangan `npx supabase start` di VPS. Jangan commit file env.

---

## Rahasia — jangan masuk git / dokumen

| File | Git | Isi |
| --- | --- | --- |
| `.env.production` | **diabaikan** (`.gitignore`) | Kunci produksi. Hanya di laptop (draf) dan `/opt/novacrm/.env.production` |
| `.env` | diabaikan | Interpolasi Compose (`APP_HOST`, …). Di-generate `scripts/check-prod-env.sh` |
| `.env.local` | diabaikan | Lab laptop |
| `.env.production.example` | **boleh** di-commit | Placeholder saja (`crm.example.com`, `your-anon-key`, `change-me-minio`) |

Isi env di laptop:

```bash
cp .env.production.example .env.production
# edit .env.production — nilai nyata, jangan commit
```

Salin ke VPS (setelah SSH hidup):

```bash
scp .env.production ubuntu@43.133.133.151:/opt/novacrm/.env.production
```

Jangan `scp` `.env.production.example` yang sudah diisi kunci. Jangan paste URL/key/password ke chat, issue, atau markdown.

Wajib di `.env.production` (tanpa menuliskan nilainya di sini):

- `APP_HOST`, `MINIO_PUBLIC_HOST`, `APP_URL`, `ACME_EMAIL`
- `NEXT_PUBLIC_SUPABASE_*` dan `NOVACRM_SUPABASE_*` (URL + publishable, sama)
- `SUPABASE_SERVICE_ROLE_KEY` = **secret** `sb_secret_…` atau legacy `service_role` (bukan publishable)
- `DATABASE_URL` = **session pooler IPv4** (bukan `db.<ref>.supabase.co` kalau VPS tidak punya IPv6)
- `MINIO_ROOT_USER` = `MINIO_ACCESS_KEY`, `MINIO_ROOT_PASSWORD` = `MINIO_SECRET_KEY` (bukan `change-me-*` / `minioadmin`)
- `REDIS_URL=redis://redis:6379`, `MINIO_ENDPOINT=http://minio:9000` (nama service Docker)

Cek tanpa menampilkan secret:

```bash
cd /opt/novacrm
sh scripts/check-prod-env.sh
```

---

## Yang sudah dipasang

| Item | Nilai |
| --- | --- |
| App | https://novacrm.click |
| File (S3 / presign) | https://files.novacrm.click |
| Health | https://novacrm.click/api/health |
| Tenant lab (API) | https://novacrm.click/api/v1/t/novacrm-demo |
| VPS | `43.133.133.151` — SSH `ubuntu@43.133.133.151` |
| Kode di VPS | `/opt/novacrm` |
| Image | `ghcr.io/bontiharyanto/novacrm:latest` |
| Repo | https://github.com/bontiharyanto/novacrm |
| DB / Auth | Supabase **hosted** (bukan Postgres di VPS) |
| Scale | `--scale web=1` (VPS 4 GB — jangan `web=3`) |
| Traefik | `traefik:v3.6.1` (wajib; `v3.3` rusak di Docker 29) |

DNS A (keduanya ke **`43.133.133.151`**):

| Nama record | Hostname |
| --- | --- |
| `@` | `novacrm.click` |
| `files` | `files.novacrm.click` |

Firewall VPS: TCP **22**, **80**, **443** dari internet. Jangan buka 3000, 3100, 5432, 6379, 9000, **9001**.

Konsol MinIO (`:9001`) **tidak** dipublikasikan. Unggah file dari app, bukan `https://files.novacrm.click:9001`.

---

## Arsitektur: laptop vs produksi

```
Laptop                          GitHub                         VPS
──────                          ──────                         ───
npm run local:dev               push main                      /opt/novacrm
localhost:3000                  Actions: test +                docker compose prod
(hot reload)                    build image GHCR               Traefik :80/:443
                                                                   │
                              .env.production  ──scp──►  .env.production
                              (gitignore)                (jangan git add)
```

Mengubah file di Mac **tidak** mengubah https://novacrm.click sampai image baru di-pull di VPS.

---

## 1. Laptop (sekali, sebelum VPS)

```bash
cd novacrm
npm run local:setup          # lab Docker + Supabase lokal
npm run local:dev            # http://localhost:3000
```

Untuk instance ini, schema produksi sudah di hosted Supabase:

```bash
npm run hosted:setup         # migrations + seed + demo auth — jangan db reset
```

Demo (ganti setelah login produksi): `NovaCRM!2026`.

---

## 2. VPS pertama kali (sudah dilakukan)

Ringkas apa yang membuat situs ini hidup. Ulangi hanya di mesin baru.

1. Ubuntu 24.04, Docker Engine, user `ubuntu`, clone ke `/opt/novacrm`.
2. Jangan `apt install npm` di host. Jangan `curl https://get.docker.com` jika `docker` sudah ada.
3. `scp` `.env.production` ke `/opt/novacrm/.env.production`.
4. DNS A `@` dan `files` ke IP VPS **yang sama dengan SSH** (bukan IP panel lama).
5. Naikkan stack:

```bash
cd /opt/novacrm
chmod +x scripts/*.sh
sh scripts/check-prod-env.sh
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans --scale web=1
```

`--env-file .env.production` wajib supaya label Traefik jadi `Host(\`novacrm.click\`)`, bukan `novacrm.local`.

6. Traefik harus **v3.6.1+** (Docker 29 menolak API 1.24):

```bash
grep image docker-compose.prod.yml | head -1
# image: traefik:v3.6.1
```

7. Health:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(await r.text())})"
curl -sS https://novacrm.click/api/health
```

Harus `"status":"ok"`, `"redis":"up"`. Sertifikat Let's Encrypt (`CN=novacrm.click`), bukan `TRAEFIK DEFAULT CERT`.

Jangan `npm run prod:bootstrap` di VPS 4 GB (itu `web=3`).

---

## 3. Ubah kode di laptop → web produksi

### A. Tes di laptop

```bash
cd /Users/haryanto/Projects/novaCRM/novacrm
npm run local:dev
```

Buka http://localhost:3000.

### B. Push ke `main`

Commit + push (jangan sertakan `.env.production`). GitHub Actions: **Test** → **Build** image `ghcr.io/bontiharyanto/novacrm:latest`.

Tanpa secret `DEPLOY_HOST`, job SSH **dilewati**. Image baru ada di GHCR; VPS belum berganti sampai langkah C.

Tunggu job **Build multi-arch and push GHCR** hijau.

### C. Pull di VPS

```bash
ssh ubuntu@43.133.133.151
cd /opt/novacrm
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans --scale web=1
```

Kalau ada file baru di `supabase/migrations/`:

```bash
sh scripts/migrate.sh
```

(File yang sudah tercatat di `schema_migrations` dilewati. Jangan `seed.sql` ke DB yang sudah berisi data klien.)

Browser: hard refresh `Cmd+Shift+R`. Cek https://novacrm.click/api/health.

### D. Hanya SQL / env, tanpa UI

- SQL: `hosted:setup` di laptop **atau** `migrate.sh` di VPS (satu DB hosted).
- Env: edit `/opt/novacrm/.env.production` di VPS (atau `scp` ulang), lalu `up -d --force-recreate --scale web=1`. Jangan commit file itu.

---

## 4. Login & tenant uji

| Siapa | URL | Login |
| --- | --- | --- |
| Desk | https://novacrm.click | `admin@novacrm.app` |
| **Tenants** | https://novacrm.click/tenants | **`superadmin@novacrm.app` saja** |
| Tenant baru | https://novacrm.click/tenants/new | superadmin |

`admin@` tidak melihat menu Tenants (dialihkan ke `/dashboard`).

Isi plan, tanggal kontrak, grace. Lab `novacrm-demo` biarkan **Protected**. Data tidak dihapus saat expire.

Setup account, divisi/dept, user portal, dan arsip (tanpa Delete): [tenant-operations.md](user-guide/tenant-operations.md).

---

## 5. Yang tidak boleh

- Commit `.env.production`, `.env`, `.env.local`
- Isi kunci nyata ke `.env.production.example`
- `web=3` / `prod:bootstrap` di VPS 4 GB
- Buka port MinIO / Redis / Ops / Postgres
- `https://files.novacrm.click:9001` dari browser
- `git pull` yang men-downgrade Traefik ke `v3.3` (SSL/404 lagi)

---

## 6. Troubleshooting

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| SSH timeout ke IP panel | Bukan IP VM yang jalan | SSH ke `43.133.133.151` |
| `npm: not found` di VPS | Host tidak butuh Node | `sh scripts/check-prod-env.sh` |
| `Moved Permanently` / `308` | Traefik redirect HTTP→HTTPS | Health di dalam container `:3000` atau `https://novacrm.click` |
| `TRAEFIK DEFAULT CERT` + 404 | Label `Host(novacrm.local)` atau Traefik tidak baca Docker | `--env-file .env.production` + Traefik **v3.6.1** |
| `client version 1.24 is too old` | Traefik v3.3 vs Docker 29 | Pin `traefik:v3.6.1`, recreate |
| `:9001` timeout | Port tidak dipublish | Pakai app / `https://files.novacrm.click` (S3) |
| `pg_dump: server version mismatch` | Image backup 16 vs Supabase 17 | Recreate `backup` (`postgres:17-alpine`) — [BACKUP.md](BACKUP.md) |
| `no such service: web: disabled` | `up backup --scale web=1` | Recreate tanpa `--scale` |
| `/tenants` hilang | Role `admin` | Login `superadmin@novacrm.app` |

Log:

```bash
cd /opt/novacrm
docker compose -f docker-compose.prod.yml logs traefik --tail 80
docker compose -f docker-compose.prod.yml logs web --tail 80
```

---

## 7. CI opsional (deploy otomatis)

Secret GitHub (nilai di password manager, bukan di repo): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH=/opt/novacrm`, `DATABASE_URL`.

Workflow `.github/workflows/deploy.yml` masih `--scale web=3`. Untuk VPS 4 GB, tetap pull manual dengan `web=1` sampai workflow diubah.
