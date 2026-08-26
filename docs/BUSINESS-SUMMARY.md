# Ringkasan business plan — SaaS cloud (brainstorm)

Dokumen internal. Bukan SOW ke klien. Harga = usulan. Detail harga/campaign: [BUSINESS.md](BUSINESS.md). Playbook jual: [GTM.md](GTM.md). Batas teknis: [OPERATIONS.md](OPERATIONS.md).

---

## Verdict

NovaCRM **bisa dijual sebagai SaaS cloud** sekarang, dengan framing **managed multi-tenant terbatas** — bukan platform HA nasional, bukan ServiceNow-lite.

Model yang cocok: **sewa tenant + setup wajib + add-on channel**. Sales-assisted (demo → trial tenant baru). Invoice transfer dulu; billing in-app belakangan.

---

## Positioning

**Satu kalimat:** antrian ITSM + portal + WA, SLA, CMDB, roster — multi-klien, Bahasa Indonesia, tanpa proyek ServiceNow.

| Boleh dijanjikan | Jangan diklaim |
| --- | --- |
| Satu antrian, SLA, jejak, CSAT | HA 3 replica / multi-region |
| ITSM + CMDB + WFM dalam satu tenant | Setara ServiceNow ITOM Discovery |
| Go-live minggu, demo 35 menit | 3 tenant × 100 tiket/hari di Supabase Free |

**Beachhead:** MSP 1–3 klien (Excel + grup WA). Lalu IT internal 8–40 orang. Lalu BPO L1 (WFM).

---

## Paket usulan (3 skenario)

| | Starter | **MSP (utama)** | Enterprise |
| --- | --- | --- | --- |
| Account | 1 | 2–5 | banyak (wajar) |
| Agen | ≤ 8 | ≤ 15 | ≤ 40 |
| Tiket/bulan | ≤ 800 | ≤ 2.000 | ≤ 5.000 (butuh Pro) |
| MRR orde | 2,5–4 jt | **5–8 jt** | 12–20 jt |
| Setup | 5–10 jt | **10–15 jt** | 15–25 jt |

Fokus 6 bulan: **paket MSP**. Annual: bayar 10 bulan dapat 12.

Plan di app (`trial` / `standard` / `enterprise`) = label; bukan harga UI.

---

## Alur jual

```
Outreach hangat → Discovery 20' → Demo 35' (+ 2' major)
  → Trial 14 hari (tenant BARU) → Setup berbayar → Standard
```

Tolak trial di `novacrm-demo` bersama.

**Target 90 hari:** 3 trial berkualitas → 1 Standard bayar → pipeline 1–2 Enterprise.

**Materi:** flyer [www.novacrm.click](https://www.novacrm.click), [DEMO-E2E.md](DEMO-E2E.md), [DEMO-MAJOR-INCIDENT.md](DEMO-MAJOR-INCIDENT.md), [GTM.md](GTM.md).

---

## Kerangka SOW (1 halaman)

Wajib ada: objek sewa tenant; meter (agen/account/tiket/channel); termasuk / tidak termasuk; SLA best-effort WIB + RPO ~24 jam; data tidak dihapus saat pause; grace → auto-pause; cara bayar transfer; onboarding singkat; exit/export.

Kalimat kapasitas: *platform shared; volume di atas meter = quote upgrade infra/DB terpisah.*

---

## Unit ekonomi (kasar)

- COGS kecil (VPS + Pro ~USD 25 jika volume naik + API channel).
- 1 deal MSP Year-1 (setup + 12× MRR) orde puluhan juta IDR — sehat **jika** volume tidak meledak di Free.
- Jangan close 3 tenant ramai sebelum Supabase Pro + restore drill + dump offsite.

---

## Risiko utama

| Risiko | Mitigasi bisnis |
| --- | --- |
| Over-sell kapasitas | Cap di SOW; Pro sebelum ~400 MB |
| Trial di lab bersama | Tenant baru selalu |
| Janji HA / Discovery | Tolak di discovery |
| WA makan margin | Add-on + cap |
| Billing belum di app | Transfer + pause grace |

---

## Fase (bukan roadmap fitur)

| Fase | Isi |
| --- | --- |
| **A (0–3 bln)** | Jual pilot: 1–2 tenant bayar, invoice manual, ops jujur |
| **B (3–9 bln)** | Meter sederhana, backup offsite, 1 case study, SOW standar |
| **C (9–18 bln)** | Billing in-app, trial terbatas self-serve, infra lebih besar |

Jangan loncat A → C.

---

## Agenda founder (tanpa coding)

1. 10 kontak MSP nyata → copy GTM + flyer.
2. 2 demo terjadwal.
3. SOW draft dari kerangka di atas.
4. Kunci harga internal paket MSP.
5. Ops: password lab, restore scratch, sadar trigger Pro.

---

## Putusan

1. Ya — jual SaaS cloud, framing terbatas.
2. Beachhead MSP; paket B.
3. Setup wajib deal pertama.
4. Sales-assisted sampai billing + kuota matang.
5. Satu close Standard > 20 demo fitur.
6. Materi BUSINESS / GTM / flyer / major lab sudah cukup; bottleneck berikutnya = **pipeline**, bukan dokumen.
