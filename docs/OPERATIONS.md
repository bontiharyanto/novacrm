# Kesiapan operasional

Status instance **novacrm.click**: Ubuntu VPS Jakarta (2 vCPU / 4 GB / 60 GB) + Supabase hosted (plan **Free**) + MinIO/Redis di VPS.

Dokumen ini membatasi apa yang boleh dijual sebagai “sudah produksi”. Bukan checklist fitur desk (itu di [user-guide](user-guide/README.md)). Demo klik: [DEMO-E2E.md](DEMO-E2E.md).

Cadangan: [BACKUP.md](BACKUP.md). Restore: [RESTORE.md](RESTORE.md). VPS: [VPS.md](VPS.md).

---

## Putusan

**Aman untuk operasional terbatas:** satu tenant, volume kecil, operator yang bisa SSH ke VPS.

**Belum aman** sebagai desk produksi 100 tiket/hari per tenant, atau 3 tenant pada kuota Free, atau klaim HA (banyak replica web).

---

## Yang sudah layak dipakai sehari-hari

- Aplikasi di `https://novacrm.click` — Auth, RLS `tenant_id`, Realtime
- Service desk, WFM (roster, jam shift `/wfm/shifts`, tukar shift, lonceng), Reports (tiket + Workforce export)
- Lampiran di MinIO VPS (`files.novacrm.click`), bukan disk Supabase
- Dump Postgres terverifikasi (`pg_dump` 17.x vs server 17.x); cron **02:00 Asia/Jakarta**
- Compose: `web=1` (RAM 4 GB). Jangan `--scale web=3`

---

## Risiko yang masih terbuka

| Risiko | Artinya | Mitigasi |
| --- | --- | --- |
| Restore belum diuji ke project scratch | Dump ada; pulih belum terbukti | Satu kali [RESTORE.md](RESTORE.md) ke project **baru** |
| Dump hanya di volume VPS | SSD/VM rusak = dump ikut hilang | Isi `BACKUP_S3_*` (R2/S3) atau salin `.sql.gz` ke luar mesin |
| Supabase Free ~500 MB data | 1 tenant × 100 tiket/hari penuh dalam ~4–8 bulan; 3 tenant × 100/hari jauh lebih cepat | Pantau Observability; naik **Pro (8 GB)** sebelum ~400 MB |
| VPS 4 GB RAM | `web=3` / banyak worker → OOM | Tetap `web=1`; worker 1 ([WORKERS.md](WORKERS.md)) |
| Password lab / MFA mati | Akun demo bisa dipakai klien | Ganti password; MFA sebelum data nyata ([MFA.md](MFA.md)) |
| GitHub Actions SSH sering skip | Image baru tidak otomatis ke VPS | Setelah Build hijau: `git pull` + `up` manual ([VPS.md](VPS.md)) |
| Free: tidak ada backup dashboard Supabase | Hanya dump VPS | Cron 02:00 + cek file besok pagi |

Tiga tenant di **satu** project memakai **satu** kuota 500 MB (bukan 500 MB × 3).

---

## Checklist sebelum disebut operasional

- [ ] VPS `git pull` sampai crontab `0 2 * * * /scripts/cron-backup.sh` ([BACKUP.md](BACKUP.md))
- [ ] Dump manual sah: `gzip_ok`, header `PostgreSQL database dump`, ukuran bukan 0
- [ ] Pagi berikutnya: file `novacrm-YYYYMMDD.sql.gz` bertambah
- [ ] Satu restore ke project Supabase **scratch** (`CONFIRM_RESTORE=1`, URI bukan production)
- [ ] Password lab (`NovaCRM!2026` dan sejenis) sudah diganti di tenant klien
- [ ] Integrasi (mail / WA) bukan kunci classroom
- [ ] `/api/health` → Redis `up`
- [ ] Tidak menjalankan `supabase db reset` / `web=3` di VPS ini

---

## Kapasitas (perkiraan)

| Beban | Free 500 MB | Catatan |
| --- | --- | --- |
| Demo / volume kecil | Cukup berbulan-bulan | Sesuai pemakaian ~0,03 GB saat dump pertama |
| 1 tenant × 100 tiket/hari | Bukan untuk setahun | Naik Pro sebelum kuota ketat |
| 3 tenant × 100 tiket/hari | Tidak cukup | Satu disk Postgres untuk semua `tenant_id` |

Lampiran tidak masuk 500 MB (MinIO / SSD 60 GB). Yang dihitung: tiket, komentar, audit, notifikasi, auth.

Postgres **polos di VPS 4 GB** bukan pengganti drop-in (Auth + Realtime). Self-host full Supabase butuh mesin terpisah. Lihat diskusi kapasitas di [BACKUP.md](BACKUP.md); naik Pro lebih dulu daripada VPS DB kedua.

---

## Setelah go-live (rutin)

| Kapan | Apa |
| --- | --- |
| Setiap pagi (opsional) | `ls /backups/novacrm-*.sql.gz` + `tail backup.log` |
| Tiap bulan | Ukuran DB di Supabase Observability |
| Tiap kuartal | Restore drill scratch |
| Menjelang 400 MB | Billing Pro; jangan klik *Increase disk* di Free dengan harapan gratis |

---

## Referensi cepat

| Topik | Dokumen |
| --- | --- |
| SSH, Traefik, `web=1` | [VPS.md](VPS.md) |
| Dump 02:00 | [BACKUP.md](BACKUP.md) |
| Restore scratch | [RESTORE.md](RESTORE.md) |
| Cutover / migrate | [SERVER.md](SERVER.md), [MIGRATE-SERVER.md](MIGRATE-SERVER.md) |
