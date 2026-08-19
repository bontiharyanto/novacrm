# Backup — Postgres + MinIO

Cadangan harian NovaCRM di VPS. Database hosted (Supabase) di-dump ke volume Docker; lampiran MinIO di-mirror hanya jika `BACKUP_S3_*` diisi.

Kesiapan operasional (apa yang boleh disebut produksi): [OPERATIONS.md](OPERATIONS.md). Restore: [RESTORE.md](RESTORE.md). Pangkas log: [LOG-RETENTION.md](LOG-RETENTION.md).

Jangan commit `.env.production`. Jangan paste isi dump ke chat. Jangan restore dump ke project production kecuali itu tujuan pemulihan yang disepakati.

Runbook VPS: [VPS.md](VPS.md). Compose: `docker-compose.prod.yml` service `backup`.

---

## Apa yang ikut / tidak

| Isi | Tempat | Cadangan |
| --- | --- | --- |
| Tiket, roster, auth schema yang terlihat `postgres`, RLS, dll. | Supabase hosted | `pg_dump` → `/backups/novacrm-YYYYMMDD.sql.gz` |
| Lampiran (screenshot, PDF) | MinIO di VPS | Mirror ke R2/S3 hanya jika `BACKUP_S3_ENDPOINT` + `BACKUP_S3_BUCKET` ada |
| Image GHCR / kode app | GitHub | Bukan tugas job ini |

Free plan Supabase **tidak** punya backup otomatis di dashboard. Dump VPS ini yang diandalkan.

---

## Jadwal

- **02:00** setiap hari, timezone **Asia/Jakarta**
- Container `backup` (`postgres:17-alpine`) menjalankan BusyBox `crond`
- Crontab: `0 2 * * * /scripts/cron-backup.sh`
- Wrapper `cron-backup.sh` memuat env PID 1 (`DATABASE_URL`). Cron BusyBox **tidak** mewarisi env Docker; tanpa wrapper dump 02:00 bisa kosong meski dump manual berhasil
- `pg_dump` client harus **≥** versi server. Hosted saat ini **17.6** → image **17.x** (bukan `postgres:16-alpine`)
- Retensi file di volume: **7 hari** (`BACKUP_RETENTION_DAYS`)

Volume: `backup_data` → `/backups` di dalam container.

---

## Perintah di VPS

Semua dari `/opt/novacrm`. Recreate **hanya** service `backup`. Jangan tambah `--scale web=1` pada `up backup` (Compose menolak: `no such service: web: disabled`). `--scale web=1` hanya untuk `up -d` seluruh stack di mesin 4 GB.

### Recreate cron (setelah `git pull`)

```bash
cd /opt/novacrm
git checkout -- docker-compose.prod.yml
git pull --ff-only origin main

docker compose --env-file .env.production -f docker-compose.prod.yml up -d backup --force-recreate
```

### Cek crontab

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup cat /etc/crontabs/root
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup pg_dump --version
```

Harus ada baris `0 2 * * * /scripts/cron-backup.sh`. `pg_dump` harus 17.x.

### Dump sekarang (jangan tunggu jam 2)

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup /scripts/backup.sh
```

### Pastikan file berisi

Alpine memakai gzip BusyBox: **tidak ada** `gzip -l`. Pakai `-t` + header dump.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup sh -c '
ls -lh /backups/novacrm-*.sql.gz
tail -n 30 /backups/backup.log
f=$(ls -1t /backups/novacrm-*.sql.gz | head -n 1)
gzip -t "$f" && echo gzip_ok
zcat "$f" | head -n 8
'
```

Dump sah:

- Ukuran bukan 0 (DB kecil ~0,03 GB biasanya **~100 KB+** terkompresi)
- `gzip_ok`
- Header `-- PostgreSQL database dump` dan `Dumped from database version 17.x`

Log cron: `/backups/backup.log`. Setelah dump sah: pangkas log di VPS vs SQL Editor — [LOG-RETENTION.md](LOG-RETENTION.md) (§ di mana dijalankan).

---

## Restore

Runbook lengkap (scratch wajib, `CONFIRM_RESTORE=1`, jangan pakai URI production): [RESTORE.md](RESTORE.md).

Dump plain SQL **tanpa DROP**. Restore ke database yang sudah berisi tabel akan gagal. Latihan hanya ke **project Supabase baru**.

Jangan `supabase db reset` di production.

---

## Offsite (opsional)

Jika `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY` terisi, `backup.sh` juga:

- `mc mirror` bucket MinIO → `…/minio/YYYYMMDD`
- copy `novacrm-YYYYMMDD.sql.gz` → `…/postgres/`

Tanpa variabel itu, dump Postgres tetap ada di volume VPS.

---

## Troubleshooting

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `server version mismatch` (server 17, pg_dump 16) | Image backup lama | `postgres:17-alpine`, recreate `backup` |
| `Backup finished` tapi tidak ada `Dumping Postgres` | Cron tanpa `DATABASE_URL` | Pakai `cron-backup.sh`; recreate `backup` |
| `no such service: web: disabled` | `up backup --scale web=1` | Recreate tanpa `--scale` |
| `gzip: unrecognized option: l` | BusyBox gzip | Abaikan; pakai `gzip -t` |
| File 02:00 tidak bertambah | Container `backup` down / crontab salah | `ps backup`, `cat /etc/crontabs/root` |

---

## Skrip

| File | Peran |
| --- | --- |
| `scripts/cron-backup.sh` | Entry crontab 02:00 (muat env, lalu dump) |
| `scripts/backup.sh` | `pg_dump` + gzip + retensi 7 hari + mirror S3 opsional |
| `scripts/restore.sh` | `gunzip \| psql`; wajib `CONFIRM_RESTORE=1` + URI scratch — [RESTORE.md](RESTORE.md) |
