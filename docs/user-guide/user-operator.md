# Panduan Pengguna (User)

**Peran:** staf desk `agent` dan customer portal `customer`  
**Login lab**

| Siapa | Email | Password | Landasan |
| --- | --- | --- | --- |
| Agent | `agent@novacrm.app` | `NovaCRM!2026` | `/dashboard` |
| Customer | `customer@novacrm.app` | `NovaCRM!2026` | `/portal` |

**UI:** chrome English. `EN | ID` di top bar.  
**Companion:** [Admin](admin-system.md) · [Team Lead / SPV](lead-spv.md) · [Manager](manager-ops.md) · [Superadmin](superadmin.md) · [Katalog](catalog-guidance.md)

Dokumen ini untuk orang yang **memakai** NovaCRM setiap hari: mengerjakan tiket (agent) atau mengajukan / melacak permintaan (customer). Konfigurasi tenant = admin. Antrian tim = Team Lead / SPV.

---

# Bagian A — Agent (service desk)

## A.1 Yang boleh dan tidak

| Boleh | Tidak |
| --- | --- |
| Tiket: buat, assign ke diri, komentar, lampiran, hold, escalate | **Integrations** (`/settings`) |
| Aset + pergerakan, CMDB (account yang di-assign) | Membuat user, mengubah SLA, menulis katalog |
| Baca WFM (occupancy / forecast), update kehadiran sendiri | Roster / skills / on-call (itu SPV) |
| Appearance (tema / bahasa) | Import massal, workflow, accounts write |
| Filter **Mine** / **My groups** / **Unassigned** | Melihat account yang bukan membership Anda |

Jika daftar kosong: cek switcher **Account** (Internal vs Bank Nusantara), bukan “sistem rusak”.

## A.2 Masuk dan ruang kerja

1. Buka URL desk.
2. Sign in sebagai agent.
3. Switcher **Account** di bawah logo — pilih customer yang sedang dikerjakan, atau **All**.
4. Tema / bahasa di top bar. Palette `⌘K`. Tiket baru `⌘N`.

Keluar: ikon bawah sidebar.

## A.3 Antrian

Sidebar **Service desk**:

| Menu | Proses | Prefix |
| --- | --- | --- |
| **Incidents** | Gangguan tidak terencana | `INC` |
| **Problems** | Akar penyebab | `PRB` |
| **Changes** | Ubah infrastruktur | `CHG` |
| **CAB** | Antrian Change Advisory Board | — |
| **Requests** | Katalog / akses | `RITM` |
| **All tickets** | Semua proses | — |

Filter: **All** · **Mine** · **My groups** · **Unassigned**.  
Tampilan: **List** atau **Board** (seret kartu = ganti status).

Chip KPI: In queue, New, Unassigned, SLA risk — kerjakan Unassigned dan SLA risk dulu.

## A.4 Buat tiket

1. **New ticket** atau `⌘N`.
2. Pilih jenis.

| Jenis | Catalog | Catatan |
| --- | --- | --- |
| **Request** | Combo item (opsional). Boleh ad-hoc | Pilih item jika ada (VPN, Install software, …) |
| **Incident** | Combo hanya jika ada template | Jangan dipaksa; outage bisa free-text |
| **Change** | Wajib jika type = **Standard** | Normal / Emergency: rencana + backout, tanpa katalog |
| **Problem** | Tidak ada | Related incident / workaround, bukan catalog |

3. Pilih **Account** customer.
4. Judul, deskripsi, prioritas (`low` / `medium` / `high` / `critical`).
5. Setelah judul ≥ 4 karakter, panel **Knowledge** bisa muncul (contoh ketik `VPN`). Baca dulu — jangan buka duplikat jika artikel sudah menjawab.
6. Isi variabel katalog jika item dipilih (field Required tidak boleh kosong).
7. Opsional: aset/CI, group, assignee, requester.
8. Save. Nomor muncul (`INC…` / `RITM…` / …).

Tiket dari WhatsApp / Telegram / email bisa sudah terikat catalog item (VPN, install, password, outage) dengan jawaban di **Catalog answers**. Field yang belum lengkap ada di deskripsi / balasan channel.

## A.5 Kerjakan tiket (detail)

Layout **70 / 30**: percakapan kiri, properti kanan. Process strip di atas = siklus hidup jenis itu.

| Aksi | Kapan |
| --- | --- |
| **Assign to me** | Anda ambil kepemilikan |
| Ubah **status** | Maju di process strip |
| **Comment** | Update untuk requester / assignee (bisa kena notifikasi) |
| Lampiran | Upload MinIO, bukan lewat server Next.js |
| Link aset / CI | Impact dan riwayat |
| **Hold** | Tunggu vendor/customer. Wajib alasan, mis. `Pending vendor` + nomor case. SLA **berhenti** |
| **Escalate L2 / L3** | Antri ke group Internal `L2 Network` / `L3 Infra`. Jam SLA **tetap jalan** |
| **RCA** (Problem / Incident) | Problem: isi workaround + **Known error**, tautkan incident. Incident: pilih problem terkait. Lab: *Backup gagal semalam* ↔ *AC ruang server panas* |
| **Summarize** | Ringkas 3 baris (butuh plugin AI). Simpan di tiket |
| **Publish to knowledge** | Setelah **resolved** / **closed**. Artikel muncul di `/knowledge` |
| **Audit** | Kartu di bawah Activity, atau halaman `/audit` untuk semua tiket |

Status Incident: `open` → `in_progress` → `waiting` / `hold` → `resolved` → `closed`.  
Request: Submitted → Fulfillment → Fulfilled → Closed.  
Jangan **Closed** sebelum requester konfirmasi (atau kebijakan SPV).

### Badge SLA

| Tampilan | Arti |
| --- | --- |
| On track | Masih dalam target |
| Risk | Mendekati breach |
| Breached | Target terlewati — eskalasi / komentar segera |
| Paused | Hold / waiting |

Hold ≠ Escalate. Hold pause; escalate tidak.

## A.6 Aset dan CMDB

**Assets** — hardware/software master. Detail: **Move** (lokasi), **Transfer** (pemakai), **Replace** (retire + ganti). QR di `asset_tag`.

Demo: Account **Bank Nusantara** → `AST-1001`.

**CMDB** — graf hubungan per account. Demo Bank: WAN Indosat → firewall → core → AP Lt.2 (`10.20.50.0/24` VLAN 50). Buka CI untuk impact (tiket terkait).

Jika graf kosong: Anda masih di **Internal**. Switch ke Bank dulu.

## A.7 Level L1 / L2 / L3

Level **bukan** role terpisah. Semua adalah `agent` (atau lead) yang masuk assignment group.

| Level | Login lab | Kerja khas |
| --- | --- | --- |
| L1 | `sari.l1@novacrm.app` · `budi.l1@novacrm.app` · `dewi.l1@novacrm.app` | Intake, katalog Request, INC P3/P4, password reset |
| L2 | `raka.l2@novacrm.app` | Eskalasi jaringan / app; group `L2 Network` |
| L3 | `maya.l3@novacrm.app` | Infra dalam; group `L3 Infra` |
| On-call | `andi.oncall@novacrm.app` | Shift WFM on-call |

Password lab sama: `NovaCRM!2026`. Filter **My groups** menampilkan antrian group Anda. Escalate dari L1 mengisi group L2/L3 — jam SLA tetap jalan.

## A.8 Checklist harian agent

- [ ] Filter **Mine** + **Unassigned** + chip **SLA risk**
- [ ] Tiket baru di-assign (diri atau group), status bukan mengambang di New
- [ ] Komentar berbahasa jelas untuk customer
- [ ] Hold hanya jika benar-benar menunggu pihak lain + alasan
- [ ] Request katalog: jawaban variabel lengkap sebelum fulfill
- [ ] Tutup tiket hanya setelah solusi terverifikasi
- [ ] Problem punya workaround; incident terkait ditautkan
- [ ] Tiket resolved yang berguna → **Publish to knowledge**

---

# Bagian B — Customer (portal)

Customer **tidak** melihat desk, aset, CMDB, atau Settings. Hanya portal sendiri.

## B.1 Masuk

1. Buka URL yang sama, login `customer@…`.
2. Landasan `/portal`.
3. **Sign out** di header portal.

| Menu | Fungsi |
| --- | --- |
| **My tickets** | Lacak tiket Anda |
| **Catalog** | Permintaan terstruktur (record producer) |
| **New request** | Tiket bebas (bukan dari katalog) |
| **Privacy** | Notice + DSAR (hak akses data) |

## B.2 Ajukan dari katalog (disarankan)

1. **Catalog**.
2. Pilih kartu, contoh **Install software** / **VPN access**.
3. Isi pertanyaan (Location, alasan, …). Field Required wajib.
4. Submit.

Balasan otomatis / notifikasi tergantung channel yang diaktifkan admin. Nomor tiket muncul di **My tickets**.

Jangan kirim password atau data rahasia di deskripsi.

## B.3 Tiket bebas

**New request** — judul + uraian jika tidak ada item katalog yang cocok.  
Untuk gangguan layanan, tulis gejala, sejak kapan, siapa terdampak — agent akan membuat / menautkan Incident.

Jika judul mirip artikel terbit (contoh `VPN`), panel **Knowledge** menampilkan langkah yang sudah ada. Baca dulu sebelum submit.

## B.4 Lacak dan balas

Buka tiket di **My tickets** / `/portal/{id}`.

- Baca status dan komentar agent.
- Tambah komentar jika diminta info.
- Setelah **resolved** / **closed**, isi **CSAT** (1–5) di halaman tiket. Email / WhatsApp ke customer memakai tautan `/portal/{id}` (tombol **Rate this ticket**), bukan desk `/tickets/{id}`.
- Jangan buka tiket duplikat untuk isu yang sama; balas yang sudah ada.

## B.5 Privasi (UU PDP)

**Privacy** — baca notice. Ajukan DSAR jika perlu salinan / hapus data. Target lab: 30 hari.

## B.6 Checklist customer

- [ ] Pakai **Catalog** jika itemnya ada
- [ ] Satu isu = satu tiket
- [ ] Rate tiket resolved (CSAT)
- [ ] Lengkapi field wajib
- [ ] Pantau **My tickets**, bukan email saja
- [ ] Tidak mengirim kredensial di form
