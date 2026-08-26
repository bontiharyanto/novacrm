# SOW — Sewa workspace NovaCRM (siap tempel)

**Status:** template internal. Salin ke Google Doc / PDF, ganti `[…]`. Bukan SLA hukum final — sesuaikan dengan notaris/legal Anda.

**Referensi:** [BUSINESS-SUMMARY.md](BUSINESS-SUMMARY.md) · [BUSINESS.md](BUSINESS.md) · [OPERATIONS.md](OPERATIONS.md)

---

## SURAT PERINTAH KERJA / STATEMENT OF WORK  
### Sewa Workspace NovaCRM (Cloud SaaS)

| | |
| --- | --- |
| Nomor SOW | `[SOW-YYYY-XXX]` |
| Tanggal | `[DD Bulan YYYY]` |
| Penyedia | `[Nama badan usaha Anda]` (“Penyedia”) |
| Pelanggan | `[Nama badan usaha klien]` (“Pelanggan”) |
| Berlaku | `[tanggal mulai]` s.d. `[tanggal akhir]` (atau 12 bulan sejak go-live) |

---

### 1. Objek

Penyedia menyediakan **akses sewa** ke workspace aplikasi **NovaCRM** di cloud (multi-tenant, isolasi data per `tenant_id`), termasuk onboarding sesuai lingkup di bawah.

Bukan: lisensi perpetual, bukan penyerahan kode sumber, bukan pengelolaan VPS milik Pelanggan (kecuali disepakati addendum Enterprise Dedicated).

---

### 2. Paket & meter

| Item | Nilai kontrak |
| --- | --- |
| Plan | `[Starter / MSP / Enterprise]` — lihat lampiran harga |
| Tenant | 1 (satu) workspace |
| Account (badan hukum / klien akhir) | hingga `[N]` |
| Agen staf aktif | hingga `[N]` |
| Tiket dibuat / bulan kalender | hingga `[N]` |
| Channel notifikasi | `[email saja / email + WhatsApp dengan cap … pesan/bulan]` |
| Modul WFM (roster, swap, export Workforce) | `[Ya / Tidak / Add-on]` |
| Lingkungan | Shared cloud Penyedia (region Indonesia / infrastruktur yang dipakai Penyedia) |

Volume di atas meter = penawaran tertulis terpisah (upgrade kapasitas / plan).

---

### 3. Yang termasuk

1. Akses aplikasi desk (tiket INC/PRB/CHG/REQ), portal pelanggan (sesuai peran), CSAT, aset/CMDB, reports tiket.
2. Isolasi tenant; akun admin awal Pelanggan.
3. Onboarding jarak jauh hingga `[X]` hari kerja: 1 account, 1 assignment group, 1 matriks SLA, 1 item katalog, 1 sesi training remote (maks. `[2]` jam).
4. Cadangan basis data harian sesuai praktik operasional Penyedia (RPO target orde 24 jam — lihat §6).
5. Dukungan operasional: saluran `[email/WA]` pada jam kerja `[Sen–Jum, 09:00–17:00 WIB]`, best-effort.

### 4. Yang tidak termasuk

1. ServiceNow/ITOM Discovery, payroll HR, mobile app native.
2. High availability multi-region / jaminan uptime 99.9%.
3. Dedicated database atau server khusus (kecuali addendum).
4. Integrasi SAP/ERP/custom code di luar konfigurasi standar.
5. Biaya API pihak ketiga (WhatsApp gateway, email transaksi) di luar kuota yang disepakati — ditagih sebagai add-on atau at-cost + margin.
6. Proyek data migration massal di luar seed/onboarding ringan di §3.
7. Trial atau pelatihan di tenant lab bersama Penyedia.

---

### 5. Jadwal

| Tonggak | Target |
| --- | --- |
| Kick-off & akses tenant | `[hari/tanggal]` |
| Konfigurasi inti selesai | `[+N hari kerja]` |
| Go-live (pemakaian produksi Pelanggan) | `[tanggal]` |
| Serah terima singkat (checklist) | saat go-live |

Keterlambatan karena data/keputusan Pelanggan menunda tonggak tanpa penalti ke Penyedia.

---

### 6. Layanan, ketersediaan, data

1. Layanan adalah **best-effort** pada jam kerja WIB, kecuali maintenance terjadwal (pemberitahuan wajar).
2. **RPO (Recovery Point Objective)** target: orde **24 jam** (dump harian). **RTO** best-effort; bukan komitmen menit.
3. Data Pelanggan tidak dihapus semata karena jeda pembayaran; akses dapat **di-pause** setelah masa grace.
4. Grace non-bayar: `[N]` hari kalender setelah jatuh tempo → pause login; data tetap.
5. Setelah berakhirnya kontrak atau permintaan tertulis: ekspor data wajar dalam **14 hari kerja** (format yang disediakan platform / dump yang disepakati).
6. Pelanggan bertanggung jawab atas hak akses user, password, dan kepatuhan pemakaian (termasuk UU PDP untuk data yang mereka masukkan).

---

### 7. Harga & pembayaran

| Komponen | Jumlah (IDR, belum PPN jika berlaku) |
| --- | --- |
| Setup / onboarding (sekali) | `[Rp …]` — jatuh tempo `[sebelum go-live / netto …]` |
| Sewa bulanan | `[Rp …]` / bulan |
| Add-on (jika ada) | `[rinci]` |
| Diskon annual (jika ada) | bayar `[10]` bulan untuk `[12]` bulan |

Cara bayar: transfer ke rekening Penyedia `[bank, no. rek, atas nama]`.  
Bukti transfer ke `[email finance]`.  
Keterlambatan: sesuai grace §6; tidak ada penghapusan data sebagai hukuman pertama.

---

### 8. Perubahan lingkup

Perubahan meter, modul, atau integrasi = addendum tertulis + penyesuaian harga. Pekerjaan di luar §3 ditagih time & material atau quote terpisah.

---

### 9. Kerahasiaan

Masing-masing pihak menjaga informasi rahasia pihak lain yang diperoleh selama SOW, kecuali yang sudah publik atau diwajibkan hukum.

---

### 10. Penutup

SOW ini merupakan keseluruhan kesepakatan untuk lingkup di atas. Dilaksanakan setelah ditandatangani kedua belah pihak (basah atau elektronik yang diakui).

| | Penyedia | Pelanggan |
| --- | --- | --- |
| Nama | | |
| Jabatan | | |
| Tanda tangan | | |
| Tanggal | | |

---

### Lampiran A — Checklist serah terima (centang saat go-live)

- [ ] URL login tenant: `https://novacrm.click/login?tenant=[slug]`
- [ ] Admin Pelanggan bisa masuk; password lab diganti
- [ ] ≥ 1 account, 1 group, 1 SLA
- [ ] ≥ 1 katalog published (jika dipakai portal)
- [ ] Channel email/WA sesuai kontrak (bukan kunci classroom Penyedia)
- [ ] Pelanggan paham: major incident ≠ problem RCA; hold vendor pause SLA

### Lampiran B — Kontak

| Peran | Nama | Kontak |
| --- | --- | --- |
| Teknik / onboarding Penyedia | | |
| Finance Penyedia | | |
| Champion Pelanggan | | |
| Sponsor Pelanggan | | |
