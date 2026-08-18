# Restore — Postgres (+ MinIO opsional)

Pemulihan dari dump harian `novacrm-YYYYMMDD.sql.gz`. Dump **tidak** berisi `DROP`; target harus database **kosong / project scratch**.

Cadangan: [BACKUP.md](BACKUP.md). Jangan `supabase db reset` di production. Jangan paste `DATABASE_URL` atau isi dump ke chat.

---

## Yang tidak boleh

- Menjalankan `restore.sh` di container `backup` **tanpa** mengganti `DATABASE_URL`. Env container itu adalah **production**.
- Restore ke project live `novacrm.click` kecuali cutover yang disepakati (downtime, ganti URL/key di `.env.production`).
- Mengandalkan dump sebagai pengganti uji di scratch. Latihan restore **wajib** ke project baru.

Skrip menolak jalan kecuali `CONFIRM_RESTORE=1`.

---

## Siapkan file dump

Di VPS, pastikan file ada dan sah ([BACKUP.md](BACKUP.md) § cek file):

```bash
cd /opt/novacrm
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup \
  ls -lh /backups/novacrm-20260818.sql.gz
```

Ganti tanggal sesuai file (stempel `YYYYMMDD`). Retensi volume **7 hari**.

Salin ke laptop jika restore dari mesin lain (file hanya dump terkompresi, tetap data pribadi):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml cp \
  backup:/backups/novacrm-20260818.sql.gz ./novacrm-20260818.sql.gz
```

---

## Latihan (wajib): project scratch

1. Di dashboard Supabase: **New project** (bukan project production).
2. Ambil URI **session pooler IPv4** + `sslmode=require` untuk scratch. Jangan pakai URI production.
3. Image client **Postgres 17** (`postgres:17-alpine`), sama seperti dump.

### Dari VPS, hanya Postgres (tanpa sentuh MinIO production)

`BACKUP_S3_ENDPOINT=` kosong supaya `restore.sh` tidak `mc mirror` ke MinIO live.

```bash
cd /opt/novacrm

# Ganti URI scratch di shell Anda — jangan commit, jangan chat
export SCRATCH_DATABASE_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres?sslmode=require'

docker compose --env-file .env.production -f docker-compose.prod.yml exec \
  -e CONFIRM_RESTORE=1 \
  -e DATABASE_URL="$SCRATCH_DATABASE_URL" \
  -e BACKUP_S3_ENDPOINT= \
  backup \
  /scripts/restore.sh 20260818
```

### Dari laptop (Docker)

```bash
export SCRATCH_DATABASE_URL='postgresql://...?sslmode=require'

docker run --rm \
  -e CONFIRM_RESTORE=1 \
  -e DATABASE_URL="$SCRATCH_DATABASE_URL" \
  -e BACKUP_S3_ENDPOINT= \
  -v "$PWD/novacrm-20260818.sql.gz:/backups/novacrm-20260818.sql.gz:ro" \
  -v "$PWD/scripts:/scripts:ro" \
  postgres:17-alpine \
  /scripts/restore.sh 20260818
```

Berhasil: baris `Restore complete: 20260818` tanpa error `already exists` di awal.

Cek scratch: Table Editor ada `public.tickets`, jumlah kasar masuk akal. Auth user ikut dump jika role dump melihat schema `auth` — uji login di scratch dengan URL/anon **scratch**, bukan production.

Kode app **jangan** diarahkan ke scratch kecuali tes terisolasi (ganti env lokal, bukan `.env.production` VPS).

---

## MinIO (lampiran)

Hanya jika dump hari itu di-mirror ke R2/S3 (`BACKUP_S3_*` terisi saat backup).

Restore objek **menimpa** bucket MinIO tujuan. Untuk latihan, mirror ke alias/bucket **bukan** production, atau jangan jalankan blok MinIO (`BACKUP_S3_ENDPOINT` kosong seperti di atas).

Pemulihan lampiran production:

```bash
# Hanya setelah Postgres scratch/cutover disepakati
docker compose --env-file .env.production -f docker-compose.prod.yml exec \
  -e CONFIRM_RESTORE=1 \
  -e DATABASE_URL="$SCRATCH_DATABASE_URL" \
  backup \
  /scripts/restore.sh 20260818
```

(Tanpa mengosongkan `BACKUP_S3_ENDPOINT` — itu akan mirror ke MinIO **container yang sama dengan production**.)

---

## Bencana: kembalikan production

Dump plain SQL **tidak** menghapus objek lama. `psql -v ON_ERROR_STOP=1` ke database yang sudah berisi tabel akan **gagal** (`already exists`).

Urutan yang didukung:

1. Restore ke **project Supabase baru** (langkah scratch di atas).
2. Pastikan data dan login di project baru.
3. Ganti di VPS `.env.production`: `NEXT_PUBLIC_SUPABASE_*`, `NOVACRM_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` ke project baru.
4. Recreate `web` + `worker` (RAM 4 GB: `--scale web=1` pada `up -d` **seluruh** stack, bukan pada `up backup`).
5. Health: `https://novacrm.click/api/health`.
6. Project lama di-pause setelah cutover stabil.

Jangan menimpa project live dengan dump ke URI yang sama kecuali Anda sengaja mengosongkan database itu (bukan alur skrip ini).

Setelah restore dump yang lebih lama dari kode di `main`, jalankan `scripts/migrate.sh` ke URI **baru** supaya schema mengejar file SQL yang belum ada di dump.

---

## Troubleshooting

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `Refusing restore` | `CONFIRM_RESTORE` bukan `1` | Tambah `-e CONFIRM_RESTORE=1` |
| `already exists` | Target bukan DB kosong | Project scratch baru, bukan URI production |
| `Dump not found` | Tanggal salah / retensi 7 hari | `ls /backups/novacrm-*.sql.gz` |
| `server version mismatch` | `psql` 16 vs dump 17 | Image `postgres:17-alpine` |
| Restore MinIO menghapus file baru | `mc mirror --overwrite` ke bucket live | Kosongkan `BACKUP_S3_ENDPOINT` untuk drill Postgres |
| Pooler timeout | Dump besar lewat session pooler | Coba lagi; atau URI direct jika VPS punya IPv6 |

---

## Skrip

`scripts/restore.sh YYYYMMDD` — `gunzip` → `psql`. Wajib `CONFIRM_RESTORE=1` dan `DATABASE_URL` tujuan. MinIO hanya jika `BACKUP_S3_ENDPOINT` terisi.
