# Panduan Administrator Sistem

**Peran:** `admin` (tenant). Superadmin = platform, di luar dokumen ini.  
**Login lab:** `admin@novacrm.app` / `NovaCRM!2026` → `/dashboard`  
**UI:** default chrome **ID**. Ganti `EN | ID` di top bar. Isi tiket tetap seperti diketik.  
**Companion:** [User](user-operator.md) · [Team Lead / SPV](lead-spv.md) · [Manager](manager-ops.md) · [Superadmin](superadmin.md) · [Katalog](catalog-guidance.md) · [RBAC](../RBAC.md)

Administrator menyiapkan tenant agar agent, SPV, dan customer bisa bekerja. Bukan menggantikan agent mengerjakan antrian harian.

---

## 1. Yang boleh dan tidak

| Boleh | Tidak |
| --- | --- |
| Semua modul desk: tiket, aset, CMDB, laporan | Mengelola record **Tenant** (hanya superadmin) |
| Users, accounts, org, SLA, import | Mengekspos Ops `:3100` ke internet tanpa `OPS_TOKEN` |
| Catalog, workflows, governance | Menempel API key di chat / tiket / slide |
| **Integrations** dan **Notifications** | Memberi role `superadmin` (admin tidak bisa assign itu) |
| Appearance (tema / bahasa) | Mengubah tiket lama saat mengedit matriks SLA (snapshot) |

Sidebar admin: **Overview**, **Service desk**, **Configuration**, **Platform**, **Settings**.

---

## 2. Login dan ruang kerja

1. Buka URL desk (lab: http://localhost:3000 atau http://localhost:3001).
2. Email + password → **Sign in**. Atau tombol **Continue with Google / Microsoft / Okta / SAML** jika plugin identity aktif. OIDC butuh provider di Supabase Auth. SAML butuh SSO URL + cert IdP; ACS `/api/auth/saml/acs`. MFA TOTP = toggle di **Settings → Security**; lab tetap mati. Nyalakan setelah production. Admin mereset authenticator di `/users/[id]` setelah cek identitas.
3. Landasan: **Dashboard**.
4. Switcher **Account** di bawah logo: Internal / Bank Nusantara / Garuda / **All**. Tiket, aset, CMDB mengikuti filter ini.

Tema: bulan = Midnight, matahari = Daylight. Bahasa: `EN` / `ID`.  
Keluar: ikon di bawah sidebar.

Palette: `⌘K` / `Ctrl+K`. Tiket baru: `⌘N` / `Ctrl+N`.

---

## 3. Urutan setup tenant (pertama kali)

Kerjakan berurutan. Jangan buka portal customer sebelum langkah 3–6 selesai.

| Urutan | Menu | Tujuan |
| --- | --- | --- |
| 1 | **Accounts** `/accounts` | Customer (Bank, Garuda, …) + Internal |
| 2 | **Organization** `/org` | Unit + assignment group L1/L2/L3 |
| 3 | **Users** `/users` | Login staf dan customer |
| 4 | **SLA** `/sla` | Matriks type × priority per account + UC vendor |
| 5 | **Catalog** `/catalog` | Item Request / Incident / Standard change |
| 6 | **Settings → Integrations** | AI, WA, Telegram, email |
| 7 | **Settings → Notifications** | Channel aktif + uji kirim |
| 8 | **Automation** `/workflows` | Auto-assign, notify on status |
| 9 | **Governance** `/governance` | RoPA, notice, DSAR |

Setelah itu agent dan SPV bisa memakai desk. Customer memakai **Portal**.

---

## 4. Accounts

`/accounts` → **New**.

| Field | Isi |
| --- | --- |
| Name | Nama customer / Internal |
| Type | `customer` atau `internal` |
| SLA / timezone | Dipakai matriks di `/sla` |

**Account members:** staf selain manager+ hanya melihat account yang mereka di-assign. Manager dan admin melihat semua. Jika agent “tidak melihat Bank”, cek membership, bukan bug tiket.

---

## 5. Organization

`/org`

- **Units** — divisi / unit rumah (home unit user).
- **Assignment groups** — antrian tiket (`L2 Network`, `L3 Infra`). Level L1/L2/L3 berasal dari **keanggotaan group**, bukan teks bebas di user.

Tiket bisa di-queue ke group. Filter desk **My groups** memakai ini. Kebijakan dispatch WFM juga hidup di group.

---

## 6. Users

`/users` → **New user**.

| Field | Arti |
| --- | --- |
| Email / password | Login |
| Access | `customer` · `agent` · `team_lead` · `supervisor` · `manager` · `admin` |
| Home unit | Unit organisasi |
| Groups | Menentukan L1/L2/L3 dan **My groups** |
| Account membership | Scope data (kecuali manager+) |

Admin **tidak** bisa membuat `superadmin`.  
SPV hanya boleh membuat `customer` / `agent`. Jangan naikkan role sembarangan.

Kehilangan authenticator: buka profil staf → **Reset authenticator** (dua langkah). Portal customer tidak memakai MFA desk.

Password lab `NovaCRM!2026` hanya untuk tenant demo. Ganti di produksi setelah login pertama.

---

## 7. SLA

`/sla` — pilih account (contoh Bank = Gold INC P1 **15 menit / 4 jam**). Kartu **Underpinning contracts** untuk UC vendor/principal; ikat di `/org` → group.

- Matriks: **jenis tiket × prioritas** + kalender kerja.
- Tiket baru **menyalin** perjanjian. Edit matriks tidak mengubah tiket yang sudah ada.
- **Waiting** dan **Hold** menghentikan jam. **Escalate** tidak.

Uji: buat INC P1 di account itu, lihat badge SLA di detail.

---

## 8. Catalog

`/catalog` — item + variable set. Panduan field: [catalog-guidance.md](catalog-guidance.md).

Admin/SPV merancang; customer dan agent mengisi.

| Creates | Pakai |
| --- | --- |
| Request | Layanan (software, akses, hardware) |
| Incident | Template outage (opsional) |
| Change | **Standard change** saja |
| Problem | Jangan buat item |

Hanya **Published** yang muncul di combo tiket dan portal.

---

## 9. Integrations dan notifikasi

**Settings → Integrations** (`/settings`) — hanya admin. Agent tidak bisa membuka halaman ini.

| Plugin | Fungsi |
| --- | --- |
| Groq (atau AI lain) | Assistant + AI Insights. **Test connection** setelah paste key |
| WhatsApp / Telegram / Email | Outbound + webhook inbound |
| SSO (Entra / Google / Okta / SAML) | OIDC: client ID + **Allowed email domains**. SAML: SSO URL + cert PEM. Tombol di `/login`. ACS `/api/auth/saml/acs`, metadata `/api/auth/saml/metadata` |

Jangan paste production key di kelas bersama.

**Settings → Notifications** — channel `whatsapp` / `telegram` / `email`, API key, tombol **Kirim Test**.  
Log: worker BullMQ. Gagal → Ops `:3100` → Retry (bukan rewrite tiket).

---

## 10. Automation

`/workflows` → **New flow**.

| Template | Trigger | Contoh |
| --- | --- | --- |
| Standard | `ticket.create` | Auto-assign |
| Normal | inbound message | Assign → in progress → email |
| Complex | machine alert | Jika priority = critical |

Canvas: drag node. **Condition** punya handle Yes/No. **Recent runs** = eksekusi BullMQ.

Webhook inbound (header secret, bukan `?secret=`):

| Channel | Route |
| --- | --- |
| WhatsApp | `POST /api/webhooks/whatsapp` |
| Telegram | `POST /api/webhooks/telegram` |
| Email | `POST /api/webhooks/email` |
| Alerts | `POST /api/webhooks/alerts` |
| Generic | `POST /api/webhooks/generic` |

Alert berulang dalam 24 jam meng-update tiket yang sama. Pesan WA / Telegram / email (bukan alert) bisa otomatis mengisi catalog item + variabel — lihat [catalog-guidance.md](catalog-guidance.md) §13.

---

## 11. Import, aset, CMDB

**Import** `/import` (manager+): unduh template → isi → preview → import hanya jika preview tanpa error.

**Assets** — master sebelum CI. Tipe bisa ditambah (+). Detail: **Move** / **Transfer** / **Replace**, QR `asset_tag`.

**CMDB** — graf **per account**. Demo Bank: WAN → FW → core → AP Lt.2. Impact: CI terkait + tiket/aset lewat `asset_id` (bukan field CI di tiket). Jangan rewrite topologi seed. Relasi diisi saat New CI. Filter **All** mencampur graf.

---

## 12. Governance (UU PDP)

`/governance`

| Area | Ingat |
| --- | --- |
| RoPA | Inventaris pemrosesan |
| DSAR | 30 hari |
| Breach | 72 jam |
| Privacy notice | Portal customer `/portal/privacy` |

---

## 13. Laporan, Insights, WFM

- **Dashboard** — KPI + aging account aktif.
- **Reports** — 7 / 30 / 90 hari atau custom; CSV / Excel / PDF. Kartu **Vendor / UC queue** (open, breach, antrian, kredit). KPI **CSAT**.
- **Assistant** — baca fakta 7 hari; **tidak** mengubah tiket. Perlu AI di Integrations.
- **AI Insights** — tekanan antrian, risiko SLA, beban WFM, kesehatan account.
- **WFM** — occupancy/forecast mengikuti filter account; roster/skills/on-call/penilaian **tenant-wide**. Dispatch di assignment group. Auto-assign butuh worker. Admin boleh menulis roster dan penilaian; di kelas bersama jangan rewrite kecuali tenant terisolasi.

---

## 14. Kesehatan sistem (bukan menu desk)

Ops http://127.0.0.1:3100 — health, antrian `notifications` / `workflows` / `wfm`, Retry.  
App health: `/api/health` — Redis harus `up`.

Worker: default 1 proses. Cara menambah: [WORKERS.md](../WORKERS.md).

---

## 15. Checklist harian admin

- [ ] `/api/health` Redis up
- [ ] Ops: failed jobs = 0 atau sudah di-retry
- [ ] User baru punya account membership + group
- [ ] Channel notifikasi **Kirim Test** OK setelah ganti key
- [ ] Item katalog yang dipakai customer berstatus Published
- [ ] Tidak ada secret di tiket / komentar
