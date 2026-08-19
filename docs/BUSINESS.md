# NovaCRM — model bisnis, campaign, analisis

Dokumen komersial internal. Bukan SLA ke klien. Harga di sini **usulan** — belum ada billing otomatis di app (field tenant: `trial` / `standard` / `enterprise` di `/tenants`).

Kesiapan teknis membatasi apa yang boleh dijual: [OPERATIONS.md](OPERATIONS.md). Demo klik: [DEMO-E2E.md](DEMO-E2E.md). Playbook penjualan: [GTM.md](GTM.md).

---

## 1. Positioning

**NovaCRM** adalah workspace ITSM + CRM operasional untuk desk multi-tenant: tiket (INC/PRB/CHG/REQ), portal, katalog, aset/CMDB, SLA/UC, WFM (roster, tukar shift, clock-in), notifikasi WA/Telegram/email, Reports, governance UU PDP.

Bukan pengganti ServiceNow global. Bukan helpdesk “form saja”.

| Melawan | Janji yang boleh diucapkan | Jangan klaim |
| --- | --- | --- |
| Excel + WhatsApp grup | Satu antrian, SLA, jejak, CSAT | “Sudah HA 3 replica” (VPS 4 GB = `web=1`) |
| Freshdesk / Zendesk generik | ITSM + CMDB + WFM dalam satu tenant | “Setara ServiceNow ITOM Discovery” |
| GLPI on-prem berat | Multi-tenant, portal, WA inbound, demo 45 menit | “100 tiket/hari × 3 tenant di Supabase Free” |

**ICP (pembeli pertama):**

1. MSP / vendor managed services (Fortinet, jaringan, 1–3 klien) — account switcher Bank / Garuda sudah analog
2. Internal IT 8–40 orang (bank daerah, rumah sakit, kampus, BUMN kecil)
3. BPO L1 yang butuh roster + tukar shift + clock-in

**Pembeli:** Head of IT / SPV ops / owner MSP. **Pengguna:** agent, lead, portal customer.

**Wilayah:** Indonesia dulu (Bahasa ID, WIB, UU PDP, VPS Jakarta).

---

## 2. Model bisnis

### 2.1 Cara dapat uang

| Aliran | Mekanisme | Kapan |
| --- | --- | --- |
| **SaaS sewa tenant** | Satu workspace di `novacrm.click`, isolasi `tenant_id` | Inti |
| **Setup / onboarding** | 1–2 minggu: account, SLA, katalog, roster, training | Hampir setiap deal pertama |
| **Integrasi berbayar** | WA (Fonnte dll.), email produksi, SSO — biaya API + jasa | Add-on |
| **Kelas / trainer** | Paket [trainer-guide](user-guide/trainer-guide.md) | Sampingan, jangan campur tenant lab produksi |

Bukan: jual lisensi perpetual, bukan jual VPS klien (kecuali enterprise dedicated nanti).

### 2.2 Paket (selaras `/tenants`)

| Plan app | Usulan komersial | Termasuk | Tidak termasuk |
| --- | --- | --- | --- |
| `trial` | 14 hari, 1 tenant, ≤ 8 agen | Desk + portal + demo data kosong | WA produksi, SLA custom berat, WFM massal |
| `standard` | Sewa bulanan / tahunan | Tiket, portal, CSAT, aset/CMDB, Reports tiket, notifikasi email | WFM penuh + export Workforce + jam shift sebagai add-on atau masuk “Standard+” |
| `enterprise` | Kontrak 12 bulan | Semua modul, WFM, UC/vendor, SSO uji, accent, grace/auto-pause | Discovery ITOM, HR payroll, HA multi-region |

**Usulan harga (IDR, belum pajak, bisa dinego):**

| Paket | Orde | Meter |
| --- | --- | --- |
| Trial | 0 | Waktu |
| Standard | 3–8 juta / bulan | Hingga ~15 agen + ~2.000 tiket/bulan |
| Standard+ WFM | +1,5–3 juta / bulan | Roster, swap, Reports Workforce |
| Enterprise | 12–25 juta / bulan | Multi-account, UC, onboarding, 1x training |
| Setup | 8–20 juta sekali | Wajib deal pertama |

Ini **bukan** harga di UI. Invoice manual (transfer) sampai billing built-in ada.

### 2.3 Unit ekonomi (kasar)

**COGS per bulan (stack sekarang, 1–2 tenant kecil):**

| Item | Orde |
| --- | --- |
| VPS 2 vCPU / 4 GB / 60 GB Jakarta | rendah (sewa yang sudah ada) |
| Supabase Free | 0 — **hanya** volume kecil; 100 tiket/hari → rencanakan **Pro ~USD 25** |
| Domain + WA/email API | sesuai pemakaian |
| Waktu operator (backup, pull VPS) | 2–4 jam / bulan |

**Margin:** sehat di Standard jika 1–2 klien dan volume tiket rendah. **Rugi reputasi** jika jual 3 tenant × 100 tiket/hari sebelum Pro + restore drill + dump offsite.

**Kapasitas jual vs teknis:**

| Deal | Boleh close? |
| --- | --- |
| 1 tenant, puluhan tiket/hari, trial → standard | Ya, dengan checklist [OPERATIONS.md](OPERATIONS.md) |
| 1 tenant, ~100 tiket/hari, setahun | Hanya jika budget **Supabase Pro** masuk COGS |
| 3 tenant penuh di satu project Free | **Tidak** |

### 2.4 Siklus hidup tenant

Sudah ada di produk: `contract_end`, `grace_days`, `auto_pause`. Data tidak dihapus saat jeda. Itu tuas penagihan: non-bayar → pause login, bukan ancam hapus.

---

## 3. Campaign

Tujuan 90 hari: **3 trial berkualitas** (bukan traffic), **1 bayar Standard**, pipeline 2 enterprise.

### 3.1 Pesan (satu kalimat)

*Antrian ITSM + portal + WA, SLA, dan roster shift — multi-klien, Bahasa Indonesia, tanpa proyek ServiceNow.*

Bukti: demo 35 menit [DEMO-E2E.md](DEMO-E2E.md) (Bank Nusantara, hold vendor, CSAT, clock-in, export Workforce).

### 3.2 Kanal (B2B, hemat)

| Kanal | Isi | CTA |
| --- | --- | --- |
| Demo live (utama) | Zoom/kantor, dua browser | Trial 14 hari di tenant **baru** (bukan lab shared) |
| WhatsApp / email hangat | MSP dan ex-kolega IT | Jadwal demo, bukan blast harga |
| LinkedIn (ID) | 1 post/minggu: SLA hold, CSAT wajib, WFM ≠ login | “Minta slot demo” |
| Kelas kecil | Trainer pack | Upsell setup tenant terisolasi |
| Jangan dulu | Iklan massal, App Store, klaim ISO di landing | — |

Landing cukup: `novacrm.click` + `/login?tenant={slug}` klien. Jangan unggah password lab ke materi publik.

### 3.3 Kalender 90 hari

| Minggu | Aktivitas |
| --- | --- |
| 1–2 | Selesaikan restore scratch + ganti password lab produksi. Satu pager PDF dari dokumen ini + DEMO-E2E |
| 3–4 | 8 outreach MSP/IT internal. 2 demo. |
| 5–8 | 3 trial. Onboarding ringan (account, 1 SLA, 1 katalog). Ukur: tiket masuk, CSAT, clock-in |
| 9–12 | Close 1 Standard. Tulis case (tanpa data rahasia). Putuskan naik Supabase Pro jika trial ramai |

### 3.4 Materi yang boleh dipakai

- Skrip [DEMO-E2E.md](DEMO-E2E.md) + [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md)
- Playbook penjualan [GTM.md](GTM.md)
- Playbook role [user-guide](user-guide/README.md)
- Satu slide kapasitas jujur dari [OPERATIONS.md](OPERATIONS.md)

Jangan: screenshot `.env`, dump SQL, kunci Groq, janji `web=3`.

### 3.5 Funnel

```
Outreach → Demo 35' → Trial 14 hari (tenant sendiri)
  → Setup berbayar → Standard (transfer)
  → WFM add-on / Enterprise
```

Tolak trial di tenant `novacrm-demo` bersama: merusak seed + isolasi demo kelas.

---

## 4. Analisis

### 4.1 SWOT

| | |
| --- | --- |
| **S** | ITSM lengkap (proses, CMDB, UC, CSAT, WFM, WA, UU PDP) dalam satu app; multi-tenant sudah di RLS; demo cerita Bank sudah ada |
| **W** | Billing belum di app; 4 GB / Free DB; restore belum wajib-lulus; Actions SSH sering skip; SSO “test connection” bukan penuh |
| **O** | MSP Indonesia masih Excel+WA; ServiceNow mahal; Freshdesk kurang CMDB/WFM lokal |
| **T** | Klien 100 tiket/hari menabrak 500 MB; satu VPS = SPOF; kompetitor cloud global; UU PDP jika dump hanya di VPS |

### 4.2 Pasar (orde, bukan riset berbayar)

- **TAM:** belanja software ITSM/helpdesk Indonesia (enterprise + mid).
- **SAM:** desk 8–80 agen yang tidak akan beli ServiceNow.
- **SOM 12 bulan (realistis):** 1–4 tenant bayar Standard + 1 pipeline enterprise. Lebih dari itu butuh Pro + operator + mungkin VPS lebih besar.

### 4.3 Pesaing singkat

| Pesaing | Kalah di | Menang di |
| --- | --- | --- |
| ServiceNow | Kedalaman ITOM, merek | Harga, waktu go-live, ID + WA |
| Freshworks / Zendesk | Marketplace, mobile | CMDB graph, WFM shift, UC Fortinet-style |
| GLPI | Gratis on-prem | SaaS multi-tenant, portal CSAT, roster |

### 4.4 Risiko komersial

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Over-sell kapasitas | Klien marah, DB read-only | Hanya close sesuai [OPERATIONS.md](OPERATIONS.md) |
| Trial di tenant lab | Data campur | Tenant baru per prospek |
| COGS diam-diam (WA blast) | Margin habis | Add-on + cap channel |
| Pause karena non-bayar tanpa kontrak | Sengketa | Tulis grace di SOW, pakai field `/tenants` |

### 4.5 Putusan

| Pertanyaan | Jawaban |
| --- | --- |
| Produk bisa didemo dan dijual trial? | Ya |
| Bisa dijual sebagai platform nasional HA? | Belum |
| Model bisnis masuk akal? | Ya: sewa tenant + setup + add-on, paket `trial/standard/enterprise` |
| Campaign yang benar? | Demo + outreach hangat, bukan iklan massal |
| Syarat scale 3+ tenant ramai | Supabase Pro, dump offsite, restore drill, jangan `web=3` di 4 GB |

---

## 5. Checklist owner (bisnis)

- [ ] SOW 1 halaman: paket, cap tiket/agen, WA add-on, grace pause
- [ ] Tenant baru per klien (`/tenants`), bukan lab
- [ ] Harga tertulis internal (tabel §2.2) — update jika berubah
- [ ] Demo hanya dari [DEMO-E2E.md](DEMO-E2E.md) + proof 2 menit [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md); penjualan: [GTM.md](GTM.md)
- [ ] Setiap deal ≥ Standard: konfirmasi ukuran DB + rencana Pro
- [ ] Jangan janji Discovery/CMDB otomatis atau payroll HR

---

## Referensi

| Topik | Dokumen |
| --- | --- |
| Field plan / pause | [superadmin](user-guide/superadmin.md) |
| Demo | [DEMO-E2E.md](DEMO-E2E.md), [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md) |
| Penjualan / GTM | [GTM.md](GTM.md) |
| Kapasitas | [OPERATIONS.md](OPERATIONS.md) |
| Backup / restore | [BACKUP.md](BACKUP.md), [RESTORE.md](RESTORE.md) |
