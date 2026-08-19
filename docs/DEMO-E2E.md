# Demo E2E — skrip presenter

Alur klik dari login sampai portal, CMDB, WFM, dan Reports. Bukan agenda kelas (itu [trainer-guide](user-guide/trainer-guide.md)) dan bukan lab peserta ([participant-manual](user-guide/participant-manual.md)).

**Cerita:** nasabah Bank — laptop Finance lemot / WiFi lantai 2 — desk kerjakan — tautkan aset — selesaikan — customer nilai CSAT — SPV lihat roster & export coverage.

Kampanye dan paket jual: [BUSINESS.md](BUSINESS.md).

Durasi: **35–45 menit** (inti) atau **70 menit** (penuh). Bahasa UI: **ID**. Tema: Midnight.

---

## 1. Pilih panggung

| Panggung | URL | Pakai jika |
| --- | --- | --- |
| Laptop (disarankan) | http://localhost:3000 | Seed lengkap, Mailpit, aman diubah |
| Produksi | https://novacrm.click | Hanya **baca** + tiket baru milik Anda. Jangan rewrite roster/CMDB seed, jangan restore |

Password lab (bukan klien nyata): `NovaCRM!2026`

Siapkan **dua browser** (atau jendela privasi): Desk + Portal. Worker + Redis harus hidup (`/api/health` → Redis `up`). Laptop: `npm run local:dev` dan `npm run worker` jika auto-assign / email CSAT.

Jangan demo: Ops `:3100`, SQL, *Increase disk* Supabase, restore ke URI production ([RESTORE.md](RESTORE.md)).

---

## 2. Login yang dipakai

| Urutan | Email | Peran | Yang ditunjukkan |
| --- | --- | --- | --- |
| A | `admin@novacrm.app` | Admin | Account switcher, dashboard, (opsional) Appearance |
| B | `agent@novacrm.app` atau `sari.l1@novacrm.app` | Agen | Tiket, SLA, lampiran, clock-in |
| C | `spv@novacrm.app` | SPV | Roster, `/wfm/shifts`, tukar shift, Reports → Workforce |
| D | `customer@novacrm.app` | Portal | Catalog / request, CSAT |

Kalau waktu sempit: lewati A, mulai B dengan account **Bank Nusantara**.

---

## 3. Data yang harus dihafal

| Item | Account | Kenapa |
| --- | --- | --- |
| Switcher **Bank Nusantara** | Sidebar | CMDB + `AST-1001` hanya di sini |
| `AST-1001` Laptop Finance | Assets | Riwayat pindah lokasi / pemakai |
| Graph WAN → FW → AP Lt.2 | CMDB | Dampak jaringan |
| Tiket *WiFi lantai 2* | Bank incidents | Hold vendor, SLA pause |
| *Backup gagal* | Internal | Problem / L2 — jangan campur dengan Bank |
| Catalog **Install software** | Catalog | Harus **Published** |

Kalau graph kosong: masih di **Internal** atau **All**.

---

## 4. Skrip 35–45 menit

Tulis di papan: URL + tiga akun (admin/agent/customer).

### 4.1 Peta produk (3 menit) — `admin@`

1. Login → `/dashboard`.
2. Sidebar: Service desk, aset, CMDB, WFM, Reports. Account: Internal / Bank / Garuda / **All**.
3. Satu kalimat: *filter account mengubah tiket/aset/CMDB; roster WFM tenant-wide.*
4. `⌘K` / `Ctrl+K` sekali. Selesai. Jangan Settings Integrations (kunci).

### 4.2 Bank + aset + CMDB (7 menit) — tetap admin atau ganti `agent@`

1. Switcher → **Bank Nusantara**.
2. Assets → `AST-1001` → history Jakarta HQ → Lt. 3 / Finance → Operations.
3. CMDB → Graph: WAN Indosat → firewall → core → AP Lt.2 (VLAN 50).
4. Kalimat: *kalau AP down, impact mengikuti aset yang tertaut di tiket, bukan tebak-tebakan.*

### 4.3 Tiket hidup (12 menit) — `agent@`

1. Incidents, filter Bank. Buka *WiFi lantai 2* — tunjukkan **Hold** vendor + SLA pause.
2. **Tiket baru** (`⌘N`): judul `Laptop Finance lemot`, tipe Insiden, prioritas Medium, account Bank, tautkan `AST-1001` jika ada.
3. Assign ke diri sendiri. Komentar singkat. Lampiran (screenshot) — file ke **MinIO**, bukan disk Supabase.
4. Opsional 30 detik: **Escalate L2** pada tiket lain (*Backup gagal* di Internal) — clock SLA tetap jalan.

Jangan tutup *WiFi lantai 2* milik seed jika kelas masih butuh contoh hold.

### 4.4 Portal + CSAT (8 menit) — `customer@` lalu kembali agen

1. Browser 2: `customer@` → `/portal`.
2. **New request** atau catalog **Install software** (Published). Kirim.
3. Browser 1 (agen): temukan tiket itu (account sesuai), **Resolve**.
4. Browser 2: catalog / request terkunci sampai CSAT 1–5. Laptop: Mailpit http://127.0.0.1:54324 — tautan harus `/portal/{id}` bukan `/tickets/…`.
5. Customer isi skor. Portal terbuka lagi.

Kalau email tidak muncul: Redis/worker. Jangan buka Gmail.

### 4.5 WFM (8 menit) — `sari.l1@` lalu `spv@`

1. `sari.l1@`: banner shift + **Clock in** → status **Tersedia**. Kalimat: *login ≠ absensi.*
2. **Roster saya** — hanya minggu sendiri.
3. Logout. `spv@` → `/wfm/roster`. Dropdown = template; **jam diubah di `/wfm/shifts`**, bukan di sel.
4. `/wfm/swaps`: agen ajukan → rekan terima → SPV setujui. Lonceng header.
5. `/reports` → **Workforce** (bukan Tickets) → CSV/Excel → **Export**. Tidak ada Preview (gap = group × hari, termasuk weekend Sen–Jum).

Di produksi bersama: **jangan** Apply to this week massal.

### 4.6 Tutup (2 menit)

Satu slide lisan: data tiket di Supabase; file di VPS/MinIO; cadangan 02:00 ([BACKUP.md](BACKUP.md)); kesiapan = **pilot** bukan HA 3 tenant × 100 tiket/hari ([OPERATIONS.md](OPERATIONS.md)).

---

## 5. Tambahan sampai 70 menit

| Menit | Login | Klik |
| --- | --- | --- |
| +5 | `spv@` | `/sla` Bank — Gold INC P1 15m/4h; UC Fortinet/Indosat |
| +5 | `spv@` | `/reports` **Tickets** — Preview lalu CSV/Excel/PDF; kartu Vendor/UC |
| +5 | `admin@` | `/catalog` Install software Published; jangan unpublish |
| +5 | `admin@` | `/cab` antrean change (baca) |
| +5 | `superadmin@` | `/tenants` — jangan Pause tenant lab |
| +5 | agen | Realtime: dua browser, ubah status tiket yang sama |

---

## 6. Urutan ganti akun (copy ke sticky note)

```
1 admin@     dashboard + Bank + AST-1001 + CMDB
2 agent@     tiket baru + WiFi lantai 2 (hold)
3 customer@  portal request
2 agent@     resolve
3 customer@  CSAT
4 sari.l1@   clock-in + roster saya
5 spv@       shifts + swaps + Reports Workforce
```

---

## 7. Kalau rusak di tengah demo

| Gejala | Perbaikan cepat |
| --- | --- |
| Graph kosong | Account **Bank Nusantara** |
| Login loop | Laptop: Supabase `npx supabase start` |
| Redis down | `npm run local:up` / health |
| Occupancy kosong | Ganti Internal atau **All** |
| Catalog tidak muncul di portal | Item **Published** |
| CSAT tidak mengunci | Tiket belum resolved; refresh portal |
| Dropdown roster tanpa jam custom | `/wfm/shifts` |
| Reports Workforce tidak ada | Bukan agen — pakai `spv@` / admin |
| Email “terkirim” | Mailpit, bukan Gmail |

---

## 8. Yang tidak didemo ke klien

- Password lab di slide yang akan dibagikan ke luar kelas
- Kunci API Integrations
- Restore `CONFIRM_RESTORE` ke production
- `docker compose up --scale web=3` di VPS 4 GB
- Klaim “Free 500 MB cukup 3 tenant × 100 tiket/hari”

---

## Referensi

| Butuh | Dokumen |
| --- | --- |
| Setup laptop | [LOCAL.md](LOCAL.md) |
| Kelas 3.5–6.5 jam | [trainer-guide](user-guide/trainer-guide.md) |
| Role harian | [user-guide/README.md](user-guide/README.md) |
| Produksi / `web=1` | [VPS.md](VPS.md), [OPERATIONS.md](OPERATIONS.md) |
