# Panduan Team Lead & Supervisor (SPV)

**Peran**

| Role | Login lab | Fokus |
| --- | --- | --- |
| `team_lead` | `lead@novacrm.app` / `NovaCRM!2026` | Antrian: assign, escalate, baca user & WFM |
| `supervisor` | `spv@novacrm.app` / `NovaCRM!2026` | Semua milik lead + SLA, katalog, roster WFM, user customer/agent |

Keduanya mendarat di `/dashboard`.  
**Companion:** [Admin](admin-system.md) · [Manager](manager-ops.md) · [User](user-operator.md) · [Katalog](catalog-guidance.md) · [Major incident](major-incident.md)

Team Lead menjaga **aliran antrian**. SPV menambah **aturan main** (SLA, katalog, tenaga kerja). Keduanya tetap boleh mengerjakan tiket seperti agent.

---

## 1. Bedanya Lead vs SPV

| Kemampuan | Team Lead | SPV |
| --- | :---: | :---: |
| Tiket, aset, CMDB, hold, escalate | ● | ● |
| Assign ke agent / group | ● | ● |
| Baca daftar users | ● | ● |
| Buat / edit user | | ● hanya `customer` dan `agent` |
| Tulis SLA | | ● |
| Tulis catalog item | | ● |
| Roster / skills / on-call WFM | baca | ● tulis |
| Penilaian staf (`/wfm/reviews`) | ● tulis | ● tulis |
| Accounts / org / import / workflow write | | |
| Integrations | | |

Lead tidak mengubah kontrak SLA atau form katalog. Jika item salah atau target P1 terlalu ketat, eskalasi ke SPV / admin.

---

## 2. Login dan ruang kerja

1. Sign in (Lead: `lead@novacrm.app` · SPV: `spv@novacrm.app`).
2. Switcher **Account** — tinjau per customer, lalu **All** untuk beban gabungan.
3. Dashboard + chip **SLA risk** / **Unassigned** = titik mulai pagi.

Palette `⌘K`. Jangan mengandalkan hanya **Mine** — peran Anda adalah antrian tim.

---

## 3. Ritual antrian (Lead dan SPV)

Setiap shift, urutan ini:

1. **Incidents** → filter **Unassigned**, prioritas critical/high.
2. Chip **SLA risk** / **Breached** — assign owner, komentar, escalate jika perlu.
3. **My groups** — tiket yang ngantri di L1/L2/L3 Anda.
4. **Requests** menumpuk — cek item katalog lengkap; assign fulfiller.
5. **Changes** di **CAB Review** (`/cab`) — jangan biarkan window terlewat tanpa keputusan.
6. **Problems** terbuka lama — isi panel **RCA** (workaround + Known error), tautkan incident. Jangan hanya komentar. Lab: *Backup gagal semalam*.
6b. **Major incident** — satu INC payung untuk banyak tiket peristiwa yang sama. Tautkan anak dari panel kanan; resolve induk dengan centang **Selesaikan juga tiket anak**. Jangan campur dengan RCA Problem. Prosedur: [major-incident.md](major-incident.md).
7. **OLA** — sidebar **Organization** (`/org`) → buka group → field **OLA response / resolve** dan **Party**. Jam antrian group internal. Bukan matriks customer.
8. **UC** — `/sla` → **Underpinning contracts**. Kontrak vendor/principal (nomor, masa berlaku, penalty, matriks type × priority). Ikat ke group vendor di `/org`. Escalate ke group itu memakai jam UC, bukan menit datar group. Lab: `Fortinet TAC Gold` (`UC-FTNT-2026`) pada `L2 Vendor Fortinet`; `Indosat Circuit Principal` pada `L3 Principal Indosat`.
9. **Audit** `/audit` — siapa mengubah status/group. **Reports** memuat hold/wait (vendor vs customer), scorecard group, **CSAT**, dan **Vendor / UC queue** (open, breach OLA/UC, antrian, kredit Fortinet vs Indosat). Field **Party**: Internal / Vendor / Principal + nama (Fortinet, Indosat). Badge **OLA** / **UC** di detail tiket. Kredit breach tercatat di `/sla/uc/{id}`. Default internal: L1 30m/4h, L2 60m/8h, L3 2h/16h. Tanpa UC, group vendor tetap menit datar (Fortinet 4h/24h, Indosat 2h/8h).

### Assign

- Pilih agent yang **hadir** (WFM occupancy / roster), bukan yang sudah overload.
- Isi **assignment group** jika eskalasi level (L2/L3).
- **Assign to me** hanya untuk tiket yang Anda kerjakan sendiri.

### Escalate

**Escalate L2 / L3** mengantre ke group tier lebih tinggi. Pilih Internal (`L2 Network` / `L3 Infra`), **Vendor** (`L2 Vendor Fortinet`), atau **Principal** (`L3 Principal Indosat`). Jam SLA customer **tetap jalan**. Group internal mengulang jam **OLA**. Group yang terikat UC mengulang jam **UC** (type × priority), bukan menit datar.  
Pakai Escalate kalau ada antrian yang mengerjakan. **Hold + Pending vendor** hanya jika tidak ada yang kerja (tunggu update case).

### Hold

Hanya jika menunggu pihak luar. Wajib alasan (`Pending vendor` + case). SLA **pause**. Review hold yang > 1 hari.

---

## 4. CAB (Change)

`/cab` — antrian + kalender.

Di record change: **approve** / **reject** / **defer**.  
Normal / Emergency: isi **risk**, **implementation plan**, dan **backout** sebelum Submit / Approve. Standard boleh tanpa CAB.

| Change type | Perilaku |
| --- | --- |
| **Standard** | Wajib template katalog; pra-approve, tanpa CAB |
| **Normal** | Rencana implementasi + backout; masuk CAB |
| **Emergency** | CAB dipercepat; tetap ada backout |

Jangan approve change lab bersama kecuali trainer/tenant terisolasi.

---

## 5. Khusus SPV — SLA

`/sla` — matriks **type × priority** per account + kalender. Kartu **Underpinning contracts** = UC vendor/principal (bukan SLA customer).

- Bank lab: Gold INC P1 **15 menit / 4 jam**.
- Edit berlaku untuk tiket **baru** saja (snapshot).
- Waiting/Hold pause; escalate tidak.

Setelah mengubah P1, buat 1 tiket uji di account itu dan baca badge.

---

## 6. Khusus SPV — Catalog

`/catalog` — item + variable set. Langkah field: [catalog-guidance.md](catalog-guidance.md).

Contoh tambah layanan: **Install Antivirus** (Creates = Request, Priority Medium, variable hostname + OS).

| Jangan | Lakukan |
| --- | --- |
| Creates = Change untuk pasang antivirus | Request |
| Publish tanpa uji form | Save Draft → uji Tiket baru → Published |
| Problem sebagai catalog item | Biarkan Problem tanpa combo |

Lead: jika agent bingung field katalog, minta SPV perbaiki item, jangan suruh agent mengisi sembarang.

---

## 7. Khusus SPV — Users

`/users` → **New user**.

SPV hanya assign Access **customer** atau **agent**. Team lead / manager / admin = minta admin.

Pastikan: home unit, group (L1/L2/L3), **account membership**. Tanpa membership, agent tidak melihat tiket Bank.

---

## 8. WFM

`/wfm`

| Halaman | Lead | SPV |
| --- | --- | --- |
| Occupancy / forecast | Baca, pakai untuk assign | Baca + tindak lanjut kapasitas |
| Roster / skills / on-call | Baca; clock-in sendiri | Tulis roster (kelas: jangan rewrite shared kecuali isolasi) |
| Shift (jam) | Baca | Ubah jam / hari / timezone; tambah shift custom; sembunyikan dari dropdown |
| Tukar shift | Ajukan / terima | **Setujui** (menerapkan kedua sel) / tolak |
| Penilaian | Tulis skor 1–5 + catatan; kirim | Sama + boleh edit draf orang lain |

Shift default per tenant: **Pagi** 08:00–16:00 (Sen–Jum), **Siang** 12:00–20:00 (Sen–Jum), **Malam** 21:00–05:00, **24 jam** (1×24, setiap hari). Jam **boleh diubah** di `/wfm/shifts` (SPV/admin) tanpa rewrite sel roster — semua sel yang memakai template itu ikut jam baru. Kalau minggu lalu dan minggu ini harus jam berbeda, buat shift baru, jangan timpa yang lama.

**Roster (SPV/admin):** pilih group + shift → **Terapkan ke minggu ini**, atau unggah CSV/Excel (`date`, `email`/`name`, `group`, `shift`). Klik sel kosong menaruh shift terpilih; sel terisi + shift lain = ganti; shift sama = hapus. Agen hanya melihat **Roster saya**.

**Tukar shift (`/wfm/swaps`):** agen mengajukan, rekan menerima, SPV menyetujui. Lonceng header: rekan saat diajukan, pengaju saat diterima/ditolak, SPV saat menunggu approval. Approval menukar kedua sel secara atomik (log di `wfm_shift_swap_events`).

**Laporan WFM (`/reports` → Workforce):** export CSV/Excel (tanpa preview, tanpa PDF). Sheet **Coverage gaps** = group × hari tanpa orang (termasuk weekend jika shift Sen–Jum); **Clock-in vs roster**. Group tanpa roster di rentang diabaikan. Rentang 7/30/90 atau custom (maks 366 hari).

Presence operasional (bukan login): **Tersedia** = auto-assign; **Sibuk / Istirahat / Offline** = tidak. Assign manual tetap boleh. Clock-in/out tertulis di punch (bukan payroll HR).

Occupancy dan forecast mengikuti **filter account**. Roster/skills/on-call **tenant-wide**. **Penilaian** juga tenant-wide: skor 1–5, **Minta AI** advisory. Agent **Akui** penilaian yang sudah dikirim. Dispatch di **assignment group** (`/org`). Auto-assign butuh Redis + worker.

---

## 9. Laporan dan Insights

- **Dashboard** — aging per account aktif.
- **Reports** — Tickets: 7/30/90, preview lalu CSV/Excel/PDF. Workforce (SPV+): coverage + clock-in, export langsung tanpa preview.
- **AI Insights** — tekanan antrian, risiko SLA, beban WFM, kesehatan account. Narasi, bukan update tiket.
- **Assistant** — tanya ringkasan 7 hari; tidak mengubah record.

Pakai Insights untuk standup, bukan untuk menutup tiket.

---

## 10. Governance

SPV boleh **update** governance (DSAR / breach status). Lead hanya baca.  
SLA ingat: DSAR 30 hari, breach 72 jam. Detail: `/governance`.

---

## 11. Yang tidak Anda kerjakan

- API key / Integrations → admin
- Membuat account / unit / group baru → manager / admin
- Import CSV massal → manager / admin
- Menambah replica worker / Ops `:3100` → engineer ([WORKERS.md](../WORKERS.md))
- Menutup tiket customer tanpa konfirmasi hanya supaya chip hijau

---

## 12. Checklist shift

**Team Lead**

- [ ] Unassigned critical/high = 0 atau sudah punya owner
- [ ] SLA risk punya komentar + next action
- [ ] Hold > 24 jam di-review
- [ ] CAB hari ini ada keputusan atau jadwal ulang
- [ ] Assign mengikuti siapa yang on-shift **dan** Tersedia (sudah clock-in)

**SPV (tambahan)**

- [ ] Matriks SLA account aktif masih masuk akal
- [ ] Item katalog yang dipakai minggu ini Published dan field-nya jelas
- [ ] Agent baru punya group + account membership
- [ ] Roster / on-call minggu berjalan terisi
- [ ] Antrian **Tukar shift** (`/wfm/swaps`) diputus hari yang sama; cek gap coverage di **Reports → Workforce**
- [ ] Insights: tidak ada account yang “diam” padahal SLA breach
