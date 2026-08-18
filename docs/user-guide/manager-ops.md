# Panduan Manager Operasi

**Peran:** `manager`  
**Login lab:** `manager@novacrm.app` / `NovaCRM!2026` → `/dashboard`  
**UI:** default chrome **ID**. `EN | ID` di top bar. Isi tiket tetap seperti diketik.  
**Companion:** [Operasi tenant](tenant-operations.md) · [Admin](admin-system.md) · [SPV](lead-spv.md) · [User](user-operator.md) · [Superadmin](superadmin.md) · [RBAC](../RBAC.md)

Manager merancang **cara kerja operasional**: account, organisasi, orang, SLA, katalog, workflow, import. Bukan pemegang kunci plugin (itu admin) dan bukan pemilik platform (itu superadmin).

---

## 1. Yang boleh dan tidak

| Boleh | Tidak |
| --- | --- |
| Semua kerja desk (tiket, aset, CMDB) seperti agent/SPV | **Integrations** / **Notifications** (`/settings` selain Appearance) |
| Accounts: create / update | Record **Tenant** (nama tenant, accent, status) |
| Organization: unit + assignment group | Assign role `admin` atau `superadmin` |
| Users: create / update sampai `supervisor` | |
| SLA, catalog, workflows, governance write | |
| Import CSV/XLSX | |
| WFM penuh (roster, skills, on-call) | |

Role yang boleh Anda assign: `customer` · `agent` · `team_lead` · `supervisor`.

Anda melihat **semua account** tenant (tidak perlu `account_members` seperti agent).

---

## 2. Posisi di rantai perintah

```
Superadmin (platform)
  └── Admin (plugin, notifikasi, semua modul)
        └── Manager (org, account, import, workflow)   ← Anda
              └── SPV (SLA, katalog, roster, user agent/customer)
                    └── Team Lead (antrian)
                          └── Agent L1 / L2 / L3
                                └── Customer (portal)
```

Jika API WhatsApp gagal: admin. Jika P1 Bank terlalu longgar: SPV atau Anda di `/sla`. Jika unit baru: Anda di `/org`.

---

## 3. Ritual mingguan

1. **Accounts** — customer baru, membership staf, account yang tidak aktif.
2. **Organization** — group L1/L2/L3 masih sesuai eskalasi nyata.
3. **Users** — lead/SPV lengkap; agent punya group + (jika perlu) membership.
4. **Import** — aset/CMDB/user massal lewat preview, bukan Excel liar di tiket.
5. **Workflows** — `ticket.create` auto-assign masih benar; Recent runs tanpa error bertubi.
6. **Governance** — DSAR menumpuk? Breach terbuka?
7. **Reports / Insights** — FRT, MTTR, backlog 7 hari+, CSAT (wajib di portal setelah resolved/closed), kredit UC Fortinet/Indosat, beban per account / group.

Harian antrian tetap boleh Anda kerjakan, tetapi prioritas Anda adalah struktur, bukan menutup INC satu per satu.

---

## 4. Accounts

`/accounts` → **New**.

| Type | Pakai |
| --- | --- |
| `internal` | Desk internal, group L2/L3 |
| `customer` | Bank, Garuda, … — tiket/aset/CMDB terisolasi |

Setelah account baru:

1. Matriks **SLA** untuk account itu.
2. Membership staf yang boleh melihatnya (agent/lead). Manager sudah melihat semua.
3. Opsional: aset/CI seed atau **Import**.

Switcher sidebar **All** = gabungan. Briefing customer: switch ke account itu dulu.

---

## 5. Organization

`/org`

- **Units** — home unit user (divisi).
- **Assignment groups** — antrian. Nama jelas (`L2 Network`, `L3 Infra`). Kebijakan **dispatch WFM** di group.

Tiket **My groups** dan Escalate L2/L3 bergantung pada group ini. Jangan hapus group yang masih di-queue tiket terbuka.

---

## 6. Users

`/users` → **New user**.

| Access yang Anda boleh set | Untuk |
| --- | --- |
| `customer` | Portal |
| `agent` | Desk L1/L2/L3 (level = group) |
| `team_lead` | Ketua antrian |
| `supervisor` | SPV |

Butuh `admin`? Minta administrator sistem.  
Isi: email, home unit, group, account membership untuk non-manager.

---

## 7. SLA, katalog, workflow

- **SLA** `/sla` — sama seperti SPV; Anda men-set standar semua account, SPV menyesuaikan yang aktif. **Underpinning contracts** di halaman yang sama: kontrak Fortinet/Indosat, lalu ikat di `/org` pada group vendor/principal.
- **OLA vs UC** — group internal = menit OLA datar. Vendor/principal sebaiknya punya UC (matriks + masa kontrak + penalty). Escalate memakai target UC untuk type × priority tiket.
- **Catalog** `/catalog` — item Request / Incident / Standard change. Field: [catalog-guidance.md](catalog-guidance.md).
- **Automation** `/workflows` — template Standard / Normal / Complex. Trigger `ticket.create`, status, comment, inbound, alert. Condition Yes/No. Jangan arahkan production WA ke tenant lab.

---

## 8. Import

`/import` (khusus manager+).

1. Unduh template (CSV / Excel).
2. Isi baris. Kolom `role` untuk users: salah satu dari tujuh role.
3. **Preview** — jangan import jika ada error.
4. Import. Cek sample record di UI.

Jenis yang tersedia mengikuti katalog import di aplikasi (users, assets, CI, …).

---

## 9. Governance dan WFM

**Governance** — RoPA, DSAR 30 hari, breach 72 jam, notice portal. Anda boleh create/update.

**WFM** — occupancy/forecast mengikuti filter account; roster/skills/on-call/penilaian **satu grid untuk seluruh tenant**. Shift standar: Pagi / Siang / Malam / 24 jam. **Terapkan ke minggu ini** atau unggah CSV/Excel. Agen clock-in manual (login ≠ absensi). Dispatch: on-shift **dan** Tersedia. Policy di `/org`. Di tenant demo bersama, jangan rewrite roster atau penilaian seed kecuali isolasi disepakati.

---

## 10. Checklist manager

- [ ] Setiap customer account punya SLA + minimal satu agent membership
- [ ] Group L1/L2/L3 ada dan dipakai eskalasi
- [ ] Lead/SPV terisi per shift
- [ ] Workflow create → assign tidak gagal di Recent runs
- [ ] Import hanya lewat preview bersih
- [ ] DSAR/breach tidak menunggak
- [ ] Tidak menyimpan API key (bukan wewenang Anda)
- [ ] Briefing: FRT / MTTR / backlog 7d+ di `/reports` atau dashboard ops
