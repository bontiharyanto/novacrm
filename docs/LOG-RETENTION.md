# Retensi log — Supabase dan VPS

Apa yang **boleh dipangkas** (tumbuh terus, bukan master tiket) dan apa yang **jangan dihapus**. Tidak ada job otomatis di app; pembersihan manual **setelah dump sah** ([BACKUP.md](BACKUP.md)).

Jangan `DELETE` tanpa `WHERE`. Jangan `supabase db reset`. Jangan `docker volume prune` (itu MinIO + Redis + dump).

Kesiapan: [OPERATIONS.md](OPERATIONS.md). Jejak tiket / RoPA bukan “log sampah” — jangan pangkas `ticket_audit_events` hanya untuk kuota Free.

---

## Di mana dijalankan (jangan tertukar)

| Langkah | Mesin | Tempat | Bukan |
| --- | --- | --- | --- |
| Cek dump `.sql.gz` | **VPS** `ubuntu@…` `/opt/novacrm` | `docker compose … exec backup` | Laptop |
| `truncate` log Docker, `backup.log`, `journalctl` | **VPS** | SSH ke production | Laptop / SQL Editor |
| `SELECT` / `DELETE` tabel log | **Browser** | Supabase → project **NovaCRM produksi** → **SQL Editor** | VPS shell, laptop `psql` ke local Supabase |

Laptop `localhost` + `npx supabase start` = lab. SQL di situ **tidak** memangkas `novacrm.click`.

SQL Editor yang benar: org **Biontinix** → project yang URL-nya sama dengan `NEXT_PUBLIC_SUPABASE_URL` di `.env.production` (bukan project `controldesk`).

---

## Urutan setelah dump

1. **VPS** — pastikan dump hari ini (atau kemarin) `gzip_ok` + header `PostgreSQL database dump` ([BACKUP.md](BACKUP.md)).
2. **SQL Editor cloud** — `SELECT count` dulu. Jika masih kecil, skip `DELETE`.
3. **SQL Editor cloud** — `DELETE` hanya tabel di bawah, dengan `WHERE` tanggal.
4. **VPS** — truncate `*-json.log`, kosongkan `backup.log`, `journalctl --vacuum-time=7d`.
5. Jangan hapus `novacrm-*.sql.gz` hari ini. Skrip backup sudah memotong file \> 7 hari.

Contoh cek dump di **VPS**:

```bash
cd /opt/novacrm
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup sh -c '
ls -lh /backups/novacrm-*.sql.gz
f=$(ls -1t /backups/novacrm-*.sql.gz | head -n 1)
gzip -t "$f" && echo gzip_ok
zcat "$f" | head -n 6
'
```

---

## Yang tidak dihapus

| Tempat | Objek | Alasan |
| --- | --- | --- |
| Supabase | `tickets`, `ticket_comments`, `ticket_csat` | Data operasional |
| Supabase | `ticket_audit_events` | Jejak ubah status/group; retensi hukum (RoPA sering 365 hari), bukan log Docker |
| Supabase | `wfm_shift_swaps`, `wfm_shift_swap_events`, roster | Audit tukar shift |
| Supabase | `notification_channels`, SLA, org, users | Konfigurasi |
| Supabase | `auth.users`, `profiles` | Identitas |
| Supabase | `schema_migrations` | Deploy |
| VPS | Volume `minio_data`, `redis_data`, `backup_data` | File + dump 7 hari |
| VPS | `acme.json` (Let's Encrypt) | HTTPS |
| VPS | `.env.production` | Secret |

Platform log Supabase (API / Postgres di dashboard **Logs**): Free ~**1 hari**, Pro ~**7 hari** — **otomatis** hilang. Tidak perlu dihapus manual. WAL/system di grafik disk juga bukan tabel Anda.

---

## Supabase — tabel yang boleh dipangkas

Jalankan di **SQL Editor** project produksi (browser), **setelah dump VPS sah**. Bukan `psql` di laptop. Hitung dulu, baru `DELETE`.

Retensi usulan untuk **pilot** (bukan kewajiban hukum):

| Tabel | Isi | Usulan | Efek jika dihapus |
| --- | --- | --- | --- |
| `notification_logs` | Percobaan WA/Telegram/email | \> 90 hari | Hilang riwayat “terkirim/gagal” di Settings |
| `workflow_runs` | Recent runs otomasi | \> 90 hari | Tab Recent runs kosong untuk yang lama |
| `in_app_notifications` | Lonceng header (sudah dibaca) | `read_at` bukan null **dan** \> 30 hari | Bell lama hilang |
| `assistant_threads` | Tanya AI | `updated_at` \> 90 hari | Riwayat chat staf hilang |
| `ai_insights` | Kartu Insights | \> 60 hari | Kartu di-generate ulang saat dibuka |

### 1. Hitung

```sql
select 'notification_logs' as t, count(*) from public.notification_logs
union all select 'workflow_runs', count(*) from public.workflow_runs
union all select 'in_app_notifications', count(*) from public.in_app_notifications
union all select 'assistant_threads', count(*) from public.assistant_threads
union all select 'ai_insights', count(*) from public.ai_insights
union all select 'ticket_audit_events', count(*) from public.ticket_audit_events;
```

Yang **lebih tua dari retensi**:

```sql
select count(*) as notification_logs_90d
from public.notification_logs
where created_at < now() - interval '90 days';

select count(*) as workflow_runs_90d
from public.workflow_runs
where created_at < now() - interval '90 days';

select count(*) as inbox_read_30d
from public.in_app_notifications
where read_at is not null
  and created_at < now() - interval '30 days';
```

### 2. Hapus (contoh 90 / 30 / 60 hari)

```sql
delete from public.notification_logs
where created_at < now() - interval '90 days';

delete from public.workflow_runs
where created_at < now() - interval '90 days';

delete from public.in_app_notifications
where read_at is not null
  and created_at < now() - interval '30 days';

delete from public.assistant_threads
where updated_at < now() - interval '90 days';

delete from public.ai_insights
where created_at < now() - interval '60 days';
```

Satu tenant saja (ganti UUID):

```sql
delete from public.notification_logs
where tenant_id = '11111111-1111-1111-1111-111111111111'
  and created_at < now() - interval '90 days';
```

`VACUUM` otomatis di hosted. Jangan `VACUUM FULL` kecuali Supabase Support memintanya.

**Jangan** `truncate ticket_audit_events` untuk “menghemat 500 MB” kecuali legal/retention tertulis sudah lewat dan dump sudah ada.

Auth `refresh_tokens` / `sessions`: biarkan Auth. Jangan hapus manual.

---

## VPS — file log

Semua dari **SSH VPS** (`/opt/novacrm`). Jangan dijalankan di laptop.

### Docker (paling sering memenuhi disk)

Log container default **tidak berbatas**. Cek:

```bash
sudo du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -h
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Kosongkan isi file log **tanpa** hapus container (aman untuk app):

```bash
sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'
```

Opsional rotasi permanen — `/etc/docker/daemon.json` lalu `sudo systemctl restart docker` (downtime singkat):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
```

Jangan `docker system prune -a --volumes`.

### Cron backup

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup \
  sh -c 'wc -l /backups/backup.log; : > /backups/backup.log'
```

Dump `novacrm-*.sql.gz` sudah dipotong **7 hari** oleh `backup.sh`. Jangan hapus dump kemarin.

### systemd

```bash
sudo journalctl --disk-usage
sudo journalctl --vacuum-time=7d
```

### Redis / MinIO / Traefik

Tidak ada file log aplikasi yang perlu dihapus rutin. Jangan hapus `/data` MinIO atau AOF Redis.

---

## Jadwal usulan

| Kapan | Apa |
| --- | --- |
| Tiap bulan | `du` json.log Docker; truncate jika \> 500 MB |
| Tiap bulan | SQL count tabel di atas; delete jika puluhan ribu baris tua |
| Tiap kuartal | Dump dulu, lalu prune 90 hari |
| Jangan | Hapus `ticket_audit_events` / tiket demi kuota Free |

---

## Referensi

| Topik | Dokumen |
| --- | --- |
| Dump sebelum hapus | [BACKUP.md](BACKUP.md) |
| Kuota 500 MB | [OPERATIONS.md](OPERATIONS.md) |
| Disk VPS vs Postgres | Observability Supabase ≠ SSD 60 GB |
