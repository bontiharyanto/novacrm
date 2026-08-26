# Pricing matrix — NovaCRM SaaS (internal)

Usulan. Bukan harga di UI / flyer publik. Sesuaikan sebelum kirim proposal.  
Ringkasan: [BUSINESS-SUMMARY.md](BUSINESS-SUMMARY.md) · narasi: [BUSINESS.md](BUSINESS.md)

Semua angka **IDR / bulan**, belum PPN, kecuali Setup (sekali).

---

## 1. Matriks paket (Excel-style)

| Field | A · Starter | B · MSP (utama) | C · Enterprise |
| --- | ---: | ---: | ---: |
| MRR sewa (orde bawah) | 2_500_000 | 5_000_000 | 12_000_000 |
| MRR sewa (orde atas) | 4_000_000 | 8_000_000 | 20_000_000 |
| **Harga list yang dipakai default** | **3_000_000** | **6_500_000** | **15_000_000** |
| Setup sekali (bawah) | 5_000_000 | 10_000_000 | 15_000_000 |
| Setup sekali (atas) | 10_000_000 | 15_000_000 | 25_000_000 |
| **Setup default** | **7_500_000** | **12_000_000** | **18_000_000** |
| Account max | 1 | 5 | 20 |
| Agen aktif max | 8 | 15 | 40 |
| Tiket / bulan max | 800 | 2_000 | 5_000 |
| Email notifikasi | Ya | Ya | Ya |
| WhatsApp | Add-on | Add-on / paket | Cap included* |
| WFM full + export | Tidak | Add-on Standard+ | Ya |
| UC / vendor matrix | Tidak | Opsional | Ya |
| Training remote (jam) | 1 | 2 | 4 |
| Kontrak min | Bulanan | Bulanan / annual | 12 bulan |
| Grace non-bayar (hari) | 7 | 7 | 14 |
| Cocok ICP | IT internal kecil | **MSP 1–3 klien** | IT/BPO + vendor |

\*Cap WA Enterprise: tetapkan di SOW (contoh 3_000 pesan/bulan); overage quote.

---

## 2. Add-on

| Add-on | Meter | Harga orde / bulan | Catatan |
| --- | --- | --- | --- |
| Standard+ WFM | per tenant | 1_500_000 – 3_000_000 | Roster, swap, Reports Workforce |
| WhatsApp channel | per tenant + API cost | 500_000 + at-cost gateway | Atau fold ke MSP atas |
| Extra agen (blok 5) | per blok | 750_000 – 1_000_000 | Di atas cap paket |
| Extra account | per account | 400_000 – 600_000 | Di atas cap |
| Extra 1_000 tiket/bulan | per blok | 500_000 – 800_000 | Picu cek kapasitas DB |
| Office hour (2 jam/minggu) | retainer | 2_000_000 – 4_000_000 | Advisor, bukan L1 |
| White-label ringan (accent + nama) | sekali + kecil / bln | Setup 2_000_000; 300_000/bln | Domain kustom = quote |

---

## 3. Annual prepaid

| Paket | Rumus | Contoh @ list default |
| --- | --- | --- |
| Starter | 10 × MRR | 30_000_000 / tahun |
| MSP | 10 × MRR | 65_000_000 / tahun |
| Enterprise | 10 × MRR | 150_000_000 / tahun |

Setup tetap ditagih di muka (tidak masuk diskon 10/12), kecuali negosiasi tertulis.

---

## 4. Year-1 cash (contoh, bayar bulanan)

| Skenario | Setup | 12 × MRR | **Total Y1** |
| --- | ---: | ---: | ---: |
| Starter @ 3.0 jt | 7.5 jt | 36 jt | **43.5 jt** |
| MSP @ 6.5 jt | 12 jt | 78 jt | **90 jt** |
| MSP + WFM +1.5 jt | 12 jt | 96 jt | **108 jt** |
| Enterprise @ 15 jt | 18 jt | 180 jt | **198 jt** |

---

## 5. Floor (jangan turun di bawah tanpa alasan)

| Paket | Floor MRR | Floor setup | Alasan |
| --- | ---: | ---: | --- |
| Starter | 2_000_000 | 5_000_000 | Onboarding tetap makan waktu |
| MSP | 4_500_000 | 8_000_000 | Multi-account = support |
| Enterprise | 10_000_000 | 12_000_000 | UC + training + grace panjang |

Waive setup = hanya jika annual dibayar penuh di muka **atau** pilot strategis tertulis (max 1 / kuartal).

---

## 6. Kapan tolak / upgrade dulu

| Sinyal discovery | Tindakan |
| --- | --- |
| ≥ 100 tiket/hari | Jangan close Starter/MSP tanpa rencana Pro + meter ketat |
| ≥ 3 badan hukum × volume tinggi | Enterprise + quote kapasitas; bukan Free shared “asal jalan” |
| Minta HA 99.9% / on-prem | Di luar paket; quote terpisah atau tolak |
| Minta trial 90 hari gratis | Tolak; 14 hari + setup |
| Hanya banding seat Freshdesk | Jual CMDB + WFM + major + UC; jangan perang harga seat |

---

## 7. Mapping ke field app `/tenants`

| Plan di app | Paket komersial default | Default kuota (`max_*`) |
| --- | --- | --- |
| `trial` | Starter / 14 hari | 1 account · 8 agen · 800 tiket/bln |
| `standard` | **MSP (utama)** | 5 · 15 · 2.000 |
| `enterprise` | Enterprise | 20 · 40 · 5.000 |

Sumber kode default: `lib/tenants/quotas.ts`. Override per tenant di `/tenants/{id}` → **Usage quotas**.  
Label plan ≠ invoice otomatis. Kuota di DB; create di-enforce (`lib/tenants/meter.ts`). Desk: `/settings/usage` + banner soft-warn di dashboard (≥80%).
