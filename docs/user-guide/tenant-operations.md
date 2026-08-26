# Panduan operasional tenant (lengkap)

Cara menyiapkan **satu klien** di NovaCRM: tenant → account → organisasi (divisi/dept) → user desk & portal → SLA/katalog → arsip. Tidak menghapus data.

**Produksi:** [https://novacrm.click](https://novacrm.click)  
**Lab laptop:** http://localhost:3000 — password demo `NovaCRM!2026` (ganti di produksi).

Deploy VPS: [VPS.md](../VPS.md). Hak per role: [RBAC.md](../RBAC.md). Playbook harian: [README.md](README.md).

---

## 1. Istilah — jangan tertukar

Satu situs web. Isolasi data = `tenant_id`. Bukan subdomain per klien, bukan database per klien.

| Istilah | Apa | Contoh | Menu |
| --- | --- | --- | --- |
| **Tenant** | Workspace klien di platform | PT Maju, lab `novacrm-demo` | `/tenants` (hanya superadmin) |
| **Account** | Domain kerja di *dalam* tenant | Internal (staf) · PMMOS (customer) | `/accounts` |
| **Division / Unit** | Struktur org staf (divisi → dept) | Divisi Operasi → Dept Network | `/org` |
| **Assignment group** | Antrian tiket L1/L2/L3 | Service Desk, L2 Network | `/org` → New group |
| **User `admin` / `manager` / `agent`** | Login desk | Manager divisi | `/users` → Access staf |
| **User `customer`** | Login **portal** | Pemakai PMMOS | `/users` → Access `customer` |
| **Portal** | UI pemakai akhir | `/portal` | Otomatis setelah login customer |

```
Platform NovaCRM
 └── Tenant (PT Maju)                    ← superadmin membuat ini
      ├── Account Internal               ← org + group staf
      │    ├── Division → Unit (dept)
      │    └── Groups L1 / L2 / L3
      ├── Account customer (PMMOS, …)    ← tiket/aset milik klien itu
      ├── Users staf (admin, manager, agent)
      └── Users portal (role customer)
```

**PMMOS** di screenshot Accounts = **account customer**, bukan tenant. Menghapus PMMOS ≠ menghapus tenant.

---

## 2. Siapa boleh apa

| Tugas | Role minimum |
| --- | --- |
| Buat / pause / archive **tenant** | `superadmin` |
| Upload **logo brand** tenant (sidebar + portal) | `superadmin` → `/tenants/{id}` |
| Integrasi, notifikasi, Appearance | `admin` |
| Account, org (divisi/unit/group), import | `manager` |
| User `customer` / `agent` | `supervisor` |
| User sampai `supervisor` | `manager` |
| User `admin` | `admin` |
| Antrian tiket, escalate | `agent` / `team_lead` |
| Portal (buat tiket sendiri) | `customer` |

`admin@novacrm.app` **tidak** melihat `/tenants`. Pakai `superadmin@novacrm.app`.

Agent tidak bisa **New unit**. Manager/admin bisa.

---

## 3. Login yang benar

| Tujuan | URL | Akun |
| --- | --- | --- |
| Platform (buat tenant) | https://novacrm.click/login | `superadmin@…` |
| Tenant tertentu | `https://novacrm.click/login?tenant={slug}` | admin/manager tenant itu |
| Portal pemakai | sama, email role `customer` | setelah masuk → `/portal` |
| Daftar tenant | https://novacrm.click/tenants | superadmin |
| Tenant baru | https://novacrm.click/tenants/new | superadmin |

Slug lab: `novacrm-demo` → `https://novacrm.click/login?tenant=novacrm-demo`

API (bukan halaman UI): `https://novacrm.click/api/v1/t/{slug}`

---

## 4. Urutan setup satu tenant (wajib berurutan)

Kerjakan sebagai **admin atau manager tenant itu** (setelah superadmin selesai langkah 4.1). Jangan buka portal sebelum langkah 4.4–4.6.

### 4.1 Superadmin: buat tenant

1. Login superadmin → `/tenants` → **New tenant**.
2. Isi: nama klien, slug, accent, timezone, support email, plan, tanggal kontrak, grace.
3. Isi **admin pertama** (nama, email, password). Ini **bukan** user portal.
4. Yang ikut dibuat: account **Internal**, group **Service Desk** L1, SLA office hours.
5. Buka `/tenants/{id}` → **Brand logo** (opsional): upload PNG/JPEG/WebP/SVG ≤1 MB. Muncul di sidebar desk + header portal; nama NovaCRM tetap (co-brand).
6. Lab `novacrm-demo` biarkan **Protected**.
7. **Sign out**. Jangan pakai superadmin untuk kerja harian.

### 4.2 Masuk sebagai admin klien

`https://novacrm.click/login?tenant={slug}` + email admin yang baru dibuat. Ganti password.

### 4.3 Accounts

`/accounts` → **New**.

| Type | Pakai untuk |
| --- | --- |
| `internal` | Sudah ada dari create tenant. Org staf. Jangan archive kecuali yakin. |
| `customer` | Perusahaan/end-user (PMMOS, Bank, cabang). Tiket/aset terisolasi. |

Field: Name, Code (opsional), Status `Active`.

**Members** (bukan user portal otomatis):

| Membership | Arti |
| --- | --- |
| `owner` | Penanggung jawab account |
| `member` | Staf desk yang boleh melihat account ini (agent/lead) |
| `portal` | Boleh dipakai untuk user portal |

**Work this account** = switcher sidebar ke account itu (kerja tiket/CMDB di domain itu).

Manager melihat semua account. Agent hanya account tempat mereka di-member-kan.

### 4.4 Organisasi (divisi & dept)

`/org` — **Account switcher = Internal**.  
Kalau masih di PMMOS: “Org tree is for Internal staff” — pindah ke Internal dulu.

| Objek | Tombol | Field |
| --- | --- | --- |
| Divisi | **New division** `/org/units/new?type=division` | Type `Division`, Name, Manager opsional |
| Dept / unit | **New unit** `/org/units/new?type=unit` | Type `Unit`, Name, **Parent division**, Manager opsional |
| Antrian tiket | **New group** `/org/groups/new` | Nama (`L2 Network`), kind assignment, tier L1/L2/L3, OLA, party Internal/Vendor/Principal |

Hierarki: **Division → Unit**. Unit wajib punya parent division.

Ini **home unit** orang (kartu organisasi). Bukan antrian. Antrian = group. Jangan hapus group yang masih menampung tiket terbuka.

### 4.5 Users — staf desk

`/users` → **New user**.

| Field | Staf |
| --- | --- |
| Email / password | Login desk |
| Access | `agent` · `team_lead` · `supervisor` · `manager` (sesuai role Anda) |
| Home unit | Dept dari 4.4 |
| Groups | Menentukan L1/L2/L3 dan **My groups** |
| Account membership | Account customer yang boleh mereka lihat |

### 4.6 Users — portal customer

Masih `/users` → **New user**. Bukan `/tenants`.

| Field | Portal |
| --- | --- |
| Email / password | Login pemakai |
| Access | **`customer`** |
| Account | account type **customer** (PMMOS, dll.) |

Kasih URL: `https://novacrm.click/login?tenant={slug}`  
Setelah Sign in → `/portal` (katalog, request, tiket sendiri). Tidak masuk desk.

Jangan pakai `customer@novacrm.app` kecuali di tenant lab.

### 4.7 SLA, katalog, sisanya

| Menu | Isi |
| --- | --- |
| `/sla` | Matriks type × priority **per account customer**. UC vendor di kartu underpinning. |
| `/catalog` | Item Request / Incident / Standard change. Panduan field: [catalog-guidance.md](catalog-guidance.md) |
| Settings → Integrations | AI / WA / email (admin) |
| Settings → Notifications | Channel + uji kirim (admin) |
| `/workflows` | Auto-assign, notify |
| `/governance` | Privasi portal off sampai **Enable on portal** |

---

## 5. Hapus / nonaktifkan — tidak ada Delete account

Halaman account (Name, Code, Status, Members, **Save**) **sengaja tanpa tombol Delete**. Tiket, aset, CI, dan audit tetap terikat account. Produk tidak menghapus data klien.

| Yang ingin “dihapus” | Yang dilakukan |
| --- | --- |
| Account PMMOS tidak dipakai | Status → **`Archived`** → **Save** (`Paused` = sementara) |
| Orang keluar dari PMMOS | **Remove** di tabel Members (akun login tetap ada) |
| User tidak boleh masuk | `/users` — nonaktifkan / reset sesuai UI user; jangan hapus jejak tiket |
| Seluruh klien (tenant) | Superadmin `/tenants/{id}` → **Pause** atau **Archive**. Protected + tenant tempat Anda login tidak bisa di-pause. Data **tidak** dihapus |
| Kontrak habis | `expires_at` + grace → login ditolak; worker auto-pause jika flag nyala |

Setelah **Archived**, jangan **Work this account** untuk kerja baru. Data lama tetap bisa diaudit.

---

## 6. Checklist uji satu tenant

- [ ] Login `?tenant={slug}` sebagai admin klien berhasil
- [ ] `/accounts`: Internal + minimal satu customer (mis. PMMOS)
- [ ] Sidebar Internal → `/org`: ada division, unit (dept), group L1
- [ ] `/users`: manager/agent dengan home unit + group; customer terikat account PMMOS
- [ ] Agent switch ke PMMOS, buat tiket; tiket tidak muncul di account lain
- [ ] Logout, login email customer → mendarat `/portal`
- [ ] Archive PMMOS: status archived, Save; tidak ada tombol Delete (benar)

---

## 7. Masalah yang sering

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `/tenants` hilang / redirect dashboard | Login `admin`, bukan superadmin | `superadmin@…` |
| Tidak ada **New unit** | Role agent/lead, atau account customer aktif | Login manager; switcher **Internal** |
| Org kosong / pesan Internal staff | Switcher di PMMOS | Pilih **Internal** |
| Customer masuk desk | Access bukan `customer` | Edit user, Access = customer |
| Portal lab di tenant baru | Pakai `customer@novacrm.app` | Buat user baru di tenant itu |
| `files.novacrm.click:9001` timeout | Konsol MinIO tidak dipublish | Unggah dari app; [VPS.md](../VPS.md) |
| Tidak bisa Delete PMMOS | Desain | Archive + Save |

---

## 8. URL cepat (produksi)

| Halaman | Path |
| --- | --- |
| Login + pilih tenant | `/login?tenant={slug}` |
| Tenants | `/tenants` |
| Accounts | `/accounts` |
| Organization | `/org` |
| New division | `/org/units/new?type=division` |
| New unit (dept) | `/org/units/new?type=unit` |
| New group | `/org/groups/new` |
| Users | `/users` |
| Portal | `/portal` |
| Health | `/api/health` |

Lab: ganti origin ke `http://localhost:3000`.
