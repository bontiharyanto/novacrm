# Persiapan migrasi ke server

Dokumen ini dikerjakan **sebelum** `prod:bootstrap`. Isi checklist, kumpulkan akun dan rahasia, baru jalankan cutover di [SERVER.md](SERVER.md). Detail Compose/Traefik/GHCR: [DEPLOYMENT.md](DEPLOYMENT.md). Laptop: [LOCAL.md](LOCAL.md).

Jangan `supabase db reset`. Jangan commit `.env.local` atau `.env.production`. Jangan `seed.sql` ke database yang sudah berisi data klien.

---

## 1. Keputusan yang harus sudah ada

| Keputusan | Isi yang disepakati | Catatan |
| --- | --- | --- |
| Domain app | `APP_HOST` contoh `crm.perusahaan.id` | A/AAAA ke VPS |
| Domain file | `MINIO_PUBLIC_HOST` contoh `files.crm.perusahaan.id` | Presigned upload, bukan lewat Next.js |
| Email ACME | `ACME_EMAIL` | Let's Encrypt |
| VPS | Ubuntu/Debian, Docker, 4 GB RAM minimum, disk 40 GB+ | `linux/amd64` atau `arm64` — image GHCR multi-arch |
| Database | **Supabase Pro** (hosted), bukan `npx supabase start` | Auth + Postgres + Realtime |
| Tenant pertama | Satu tenant produksi, bukan `novacrm-demo` bersama kelas | Superadmin membuat tenant baru di `/tenants` |
| MFA | Tetap **off** sampai login admin pertama berhasil | [MFA.md](MFA.md) |
| Email produksi | Resend / Postmark — bukan Mailpit | Tanpa `RESEND_API_KEY` email tercatat gagal |
| AI | Groq (atau plugin AI lain) — kunci **baru**, bukan lab | Tanya AI / Insights / penilaian AI |

Wave 3 ServiceNow (Discovery, IntegrationHub, 1200 CI class, App Engine) **tidak** ikut cutover.

---

## 2. Akun yang harus dibuat dulu

- [ ] Organisasi GitHub `bontiharyanto/novacrm` — paket GHCR `novacrm` (publik, atau VPS sudah `docker login ghcr.io`)
- [ ] Proyek [Supabase](https://supabase.com) **baru** (jangan pakai laptop `127.0.0.1:54321`)
- [ ] VPS + user SSH (contoh `ubuntu`) + kunci `ed25519`
- [ ] DNS: dua nama di bagian 1 sudah mengarah ke IP VPS (cek `dig` sebelum Traefik)
- [ ] Resend (atau setara) + domain pengirim terverifikasi
- [ ] Groq / Gemini / OpenAI — kunci produksi
- [ ] Opsional: R2/S3 untuk backup MinIO (`BACKUP_S3_*`)

---

## 3. Salin dari Supabase (Settings)

Simpan di password manager, **bukan** di chat atau repo.

| Isi | Dari mana | Masuk ke |
| --- | --- | --- |
| Project URL | Settings → API | `NEXT_PUBLIC_SUPABASE_URL` dan `NOVACRM_SUPABASE_URL` (sama) |
| anon / publishable | Settings → API | `NEXT_PUBLIC_SUPABASE_ANON_KEY` dan `NOVACRM_SUPABASE_ANON_KEY` |
| service_role | Settings → API | `SUPABASE_SERVICE_ROLE_KEY` |
| `DATABASE_URL` | Settings → Database → URI **session pooler** | `scripts/migrate.sh` + secret GitHub `DATABASE_URL` |

Pakai password tanpa tanda kutip. `migrate.sh` menambahkan `sslmode=require` jika belum ada.

---

## 4. Isi `.env.production` (hanya di VPS)

Di laptop: salin `.env.production.example` ke file lokal yang **tidak** di-commit, isi draf, lalu salin ke `/opt/novacrm/.env.production` saat bootstrap.

Wajib (dicek `npm run prod:check`):

- `APP_HOST`, `MINIO_PUBLIC_HOST`
- `NEXT_PUBLIC_SUPABASE_*` dan `NOVACRM_SUPABASE_*`
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` — **bukan** `minioadmin` / `change-me-*`

Juga isi sebelum go-live:

- `APP_URL=https://$APP_HOST`
- `ACME_EMAIL`
- `EMAIL_FROM`, `RESEND_API_KEY`
- webhook secrets ≥ 16 karakter (`WHATSAPP_WEBHOOK_SECRET`, …) — header `x-webhook-secret` saja, jangan `?secret=`
- `MINIO_PUBLIC_ENDPOINT=https://$MINIO_PUBLIC_HOST`

Ops `:3100` **tidak** dipublish di produksi. Jangan buka ke internet tanpa `OPS_TOKEN`.

---

## 5. Secret GitHub Actions

Tanpa `DEPLOY_HOST`, push `main` tetap membangun image GHCR dan **melewati** SSH.

```bash
gh secret set DEPLOY_HOST --body "vps.contoh.id"
gh secret set DEPLOY_USER --body "ubuntu"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
gh secret set DEPLOY_PATH --body "/opt/novacrm"
gh secret set DATABASE_URL --body "postgresql://postgres:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"
```

VPS harus sudah punya `.env.production` sebelum job SSH pertama.

---

## 6. Asap di laptop (wajib sebelum VPS)

Tujuan: skema hosted + login jalan, Redis/MinIO tetap lokal.

1. Proyek Supabase kosong (atau sudah di-stamp — lihat bawah).
2. Dari laptop, kunci hosted di `.env.local` (URL Redis/MinIO tetap `127.0.0.1`):

```bash
npm run hosted:setup
```

Itu menjalankan **semua** file di `supabase/migrations` sekali, lalu seed + login demo.

3. `npm run local:dev` → login `admin@novacrm.app` / `NovaCRM!2026`.
4. Cek: tiket, Tanya AI, WFM → Penilaian, `/api/health` Redis `up`.
5. Ganti password demo **setelah** yakin Auth hosted dipakai. Jangan pakai `NovaCRM!2026` di produksi.

Jika SQL sudah pernah di-paste di dashboard (skema sudah ada):

```bash
DATABASE_URL='postgresql://...' MIGRATE_STAMP=1 sh scripts/migrate.sh
```

Lalu hanya file **baru** yang dijalankan `migrate.sh` berikutnya.

---

## 7. Migrasi yang harus ada di hosted

`scripts/migrate.sh` memakai `public.schema_migrations` dan skip file yang sudah tercatat. Urutan nama file:

| File | Isi yang relevan cutover |
| --- | --- |
| `20250808` … `20250813_*` | Foundation, tiket, aset, CMDB, katalog, CAB, governance |
| `20250814010000` … `14040000` | Accounts, org, SLA, hold/escalate |
| `20250814100000` … `14100000` | Integrasi, inbound, assistant threads |
| `20250814120000_wfm.sql` | Workforce |
| `20250814140000` + `14140100` | RBAC |
| `20250814150000` … `14180000` | Insights, plugin, SSO, account access, catalog standard |
| `20250815130000` … `15200000` | RCA, OLA/UC, MFA toggle, CSAT, tenant platform |
| `20250815300000_staff_reviews.sql` | Penilaian staf |
| `20250815310000_staff_review_ai.sql` | Opini AI pada penilaian |
| `20250815320000_assistant_threads_staff.sql` | Nova Agent: semua staf boleh simpan thread |

Setelah migrate, konfirmasi di SQL editor:

```sql
select id from public.schema_migrations order by id;
select count(*) from public.staff_reviews;
```

`staff_reviews` boleh 0 di tenant produksi baru (seed lab hanya jalan jika email `sari.l1@` / `spv@` ada).

---

## 8. Urutan cutover (setelah checklist 1–7 hijau)

Jangan mulai langkah ini jika DNS belum resolve atau `prod:check` masih placeholder.

1. `git clone` ke `/opt/novacrm`, salin `.env.production`, `chmod +x scripts/*.sh`
2. `npm run prod:check` lalu `npm run prod:bootstrap`
3. `https://$APP_HOST/api/health` → Redis `up`
4. Login admin → ganti password → Settings → Integrations (AI + mail produksi)
5. Superadmin: tenant klien di `/tenants` (bukan memakai tenant lab bersama)
6. MFA: nyalakan Auth TOTP di Supabase, lalu toggle di Settings → Security ([MFA.md](MFA.md))
7. MinIO CORS izinkan `https://$APP_HOST`
8. `./scripts/backup.sh` sekali; pastikan cron 02:00; uji restore di proyek scratch

Langkah perintah lengkap: [SERVER.md](SERVER.md) §3–6.

---

## 9. Yang tidak ikut pindah dari laptop

| Laptop | Server |
| --- | --- |
| `npx supabase start` / Studio `:54323` | Hosted Supabase |
| Mailpit `:54324` | Resend (atau setara) |
| Ops `:3100` di browser LAN | Tidak dipublish |
| Hot reload `:3000` / Docker `:3001` | Traefik HTTPS, 3× `web` |
| Password `NovaCRM!2026` | Diganti di hari pertama |
| Kunci Groq / WA lab | Kunci baru |

Image: `ghcr.io/bontiharyanto/novacrm:<git-sha>` dan `:latest`.

---

## 10. Rollback singkat

```bash
cd /opt/novacrm
IMAGE_TAG=<sha-sebelumnya> docker compose -f docker-compose.prod.yml up -d --scale web=3
```

SQL hanya maju. Undo migrasi = restore `pg_dump` harian. Jangan `db reset` di produksi.
