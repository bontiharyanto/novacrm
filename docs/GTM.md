# Go-to-market — NovaCRM

Dokumen **penjualan**. Harga, paket, SWOT: [BUSINESS.md](BUSINESS.md). Apa yang boleh dijanjikan secara teknis: [OPERATIONS.md](OPERATIONS.md).

Bukan landing publik. Jangan tempel password lab atau screenshot `.env` ke LinkedIn / proposal klien.

---

## 1. Satu kalimat (elevator)

*Antrian ITSM + portal nasabah + WhatsApp, dengan SLA, CMDB, dan roster shift — multi-klien, Bahasa Indonesia, tanpa proyek ServiceNow.*

Varian 15 detik (MSP): *Satu desk untuk beberapa klien. Switch account, tiket cabang di bawah satu major incident, hold vendor pause SLA, CSAT di portal.*

---

## 2. Siapa yang ditawari dulu

Urutan outreach (jangan acak):

| Prioritas | ICP | Nyeri yang dibeli | Bukti di demo |
| --- | --- | --- | --- |
| 1 | MSP 1–3 klien (jaringan / Fortinet) | Excel + grup WA, tiket cabang campur | Switcher Bank/Garuda + [major incident](DEMO-MAJOR-INCIDENT.md) |
| 2 | IT internal 8–40 orang | Hold ISP tanpa jejak, CSAT tidak ada | *WiFi lantai 2* hold + portal CSAT |
| 3 | BPO L1 | Login ≠ hadir, tukar shift di chat | Clock-in + `/wfm/swaps` + export Workforce |

**Pembeli:** Head of IT, SPV ops, owner MSP.  
**Bukan ICP sekarang:** perusahaan yang sudah ServiceNow ITOM Discovery; desk 100 tiket/hari × 3 tenant di stack Free.

---

## 3. Pesan per peran (talk track)

| Lawan bicara | Yang mereka dengar | Yang Anda tunjukkan | Jangan |
| --- | --- | --- | --- |
| Owner MSP | Multi-klien, isolasi, invoice sewa tenant | Account switcher, `/tenants` plan (label) | “Billing otomatis di app” |
| SPV | Antrian, major vs problem, roster | INC payung WAN + anak ATM; RCA *Backup gagal* terpisah | Resolve induk di tenant lab bersama |
| Agent | Kerja harian, SLA, lampiran | Hold, escalate, MinIO | Ops `:3100` |
| Customer (sponsor) | Portal + nilai perbaikan | CSAT lock catalog | URL `/tickets/…` di email |

---

## 4. Alur deal (GTM)

```
Outreach hangat → Discovery 20' → Demo 35' (+ 2' major)
  → Trial 14 hari (tenant BARU) → Setup berbayar → Standard
```

Tolak trial di `novacrm-demo` / novacrm.click lab bersama.

| Tahap | Durasi | Output |
| --- | --- | --- |
| Discovery | 20 menit | Cap agen, tiket/hari, WA ya/tidak, klien (account) berapa |
| Demo | 35 menit [DEMO-E2E.md](DEMO-E2E.md) | “Ya, itu antrian kami” |
| Proof 2 menit | [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md) | War room: satu INC, banyak cabang — bukan Problem |
| Trial | 14 hari | Tenant sendiri, 1 SLA, 1 katalog, 1 group |
| Close | 1 SOW | Paket [BUSINESS.md](BUSINESS.md) §2.2 + cap volume |

---

## 5. Discovery (wajib sebelum demo)

1. Berapa agen L1 yang ketik tiket setiap hari?
2. Berapa tiket masuk / hari (orde: 10 / 40 / 100)?
3. Berapa klien (badan hukum) yang harus terisolasi?
4. Channel: hanya email, atau WA/Telegram produksi?
5. Apakah hold ISP / TAC harus pause SLA?
6. Apakah outage satu circuit memunculkan banyak tiket cabang? → siapkan major incident.
7. Apakah mereka sudah punya ServiceNow / Freshdesk / Excel?

Jika jawaban (2) ≈ 100/hari **dan** (3) ≥ 3: jangan close Standard di Supabase Free. Syarat Pro ada di [OPERATIONS.md](OPERATIONS.md).

---

## 6. Demo yang dijual (urutan tetap)

Panggung: laptop `:3000` **lebih aman**. Produksi https://novacrm.click hanya baca + tiket milik Anda.

| Menit | Cerita | Klik | Kalimat jual |
| --- | --- | --- | --- |
| 0–3 | Peta | Dashboard, switcher Bank | Multi-klien, bukan satu antrian campur |
| 3–10 | Kerja desk | *WiFi lantai 2* hold vendor | SLA berhenti saat tunggu ISP |
| 10–12 | **Major** | [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md) *WAN Bank Nusantara putus* | Satu peristiwa, banyak tiket; close massal opsional |
| 12–14 | Bukan major | Internal *Backup gagal* RCA | Akar masalah ≠ war room cabang |
| 14–22 | Aset/CMDB | `AST-1001`, graph WAN | Dampak mengikuti CI, bukan tebak |
| 22–28 | Portal | `customer@`, CSAT | Nasabah nilai perbaikan, catalog terkunci |
| 28–35 | WFM (jika pembeli SPV) | Clock-in, swap, export | Hadir ≠ login |

Jangan: Integrations keys, SQL, *Increase disk*, restore production, `web=3`.

---

## 7. Keberatan → jawaban

| Keberatan | Jawaban |
| --- | --- |
| “Kami butuh ServiceNow.” | Itu ITOM/Discovery. Kami desk + CMDB + WFM + WA, go-live minggu, harga sewa tenant. |
| “Freshdesk sudah ada.” | Mereka kuat marketplace. Kami punya graph CI, UC vendor, major parent/child, roster shift. |
| “Bisa HA 3 replica?” | VPS 4 GB sekarang `web=1`. Jangan janji HA. |
| “3 perusahaan di satu Free?” | Tidak. Satu tenant ramai saja sudah rencana Pro. |
| “Major = problem?” | Tidak. Problem = akar. Major = satu outage, banyak tiket. Lab: WAN vs *Backup gagal*. |
| “Kapan billing di app?” | Invoice transfer dulu. Plan di `/tenants` label saja. |
| “Boleh trial di demo bersama?” | Tidak. Seed lab rusak. Tenant baru. |

---

## 8. Copy yang boleh di-paste

### WhatsApp / email (MSP)

```
Pak/Bu, kami punya desk ITSM multi-klien (tiket, portal, SLA, WA).
Bedanya dengan helpdesk biasa: account per nasabah + major incident
(satu outage WAN, tiket ATM/teller di bawahnya) — bukan campur di Excel.
Boleh 35 menit demo? Bukan sales call panjang.
```

### LinkedIn (1 post)

```
Outage circuit: 12 tiket cabang masuk bersamaan.
Tanpa induk, SPV kehilangan war room.
NovaCRM: satu INC payung, anak tetap tiket sendiri, resolve massal opsional.
Bukan Problem RCA. Demo 2 menit.
```

Jangan sertakan password atau URL `/tenants` internal.

### CTA

“Jadwal demo” — bukan “harga di chat”. Harga setelah discovery volume.

---

## 9. Trial sukses (hari 14)

Klien siap bayar Standard jika:

- ≥ 1 account + 1 group + 1 SLA terpakai
- ≥ 10 tiket nyata (bukan seed lab)
- ≥ 1 CSAT atau 1 hold bertalasan
- SPV bisa buka Reports tanpa Anda

Gagal trial: mereka hanya menonton lab Bank. Ulangi onboarding di tenant mereka.

---

## 10. Materi & saluran

| Materi | Pakai |
| --- | --- |
| [DEMO-E2E.md](DEMO-E2E.md) | Demo 35' |
| [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md) | Proof war room 2' |
| [user-guide/major-incident.md](user-guide/major-incident.md) | SPV setelah demo |
| [BUSINESS.md](BUSINESS.md) | Harga internal, 90 hari |
| [SOW-TEMPLATE.md](SOW-TEMPLATE.md) | SOW sewa tenant siap tempel |
| [PRICING-MATRIX.md](PRICING-MATRIX.md) | Matriks Starter / MSP / Enterprise |
| [OUTREACH-14D.md](OUTREACH-14D.md) | Sequence 14 hari + copy WA |
| [OPERATIONS.md](OPERATIONS.md) | Satu slide kapasitas jujur |
| Landing | `https://www.novacrm.click` — flyer GTM |
| Desk | `https://novacrm.click` — login klien, bukan lab |

Kanal: demo live, WA/email hangat, 1 post LinkedIn/minggu. Bukan iklan massal.

---

## 11. Checklist sebelum outreach

- [ ] Password lab produksi sudah diganti atau lab tidak dipakai klien
- [ ] Demo laptop atau klik baca-only di click
- [ ] Image web punya panel Major (VPS pull jika Actions skip SSH)
- [ ] Flyer `www.novacrm.click` hidup ([FLYER.md](FLYER.md)); DNS `www` sudah A ke VPS
- [ ] Tiket *WAN Bank Nusantara putus* masih terbuka (jangan resolve di lab)
- [ ] SOW 1 halaman siap (paket, cap, WA add-on, grace)
- [ ] Setiap prospek → tenant baru di `/tenants`, bukan `novacrm-demo`
