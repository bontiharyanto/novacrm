# Panduan Superadmin (Platform)

**Peran:** `superadmin`  
**Login lab:** `superadmin@novacrm.app` / `NovaCRM!2026` → `/dashboard`  
**UI:** default chrome **ID**. `EN | ID` di top bar. Isi tiket tetap seperti diketik.  
**Companion:** [Operasi tenant](tenant-operations.md) · [Admin](admin-system.md) · [Manager](manager-ops.md) · [RBAC](../RBAC.md) · [Deploy](../DEPLOYMENT.md) · [VPS](../VPS.md)

Superadmin adalah **pemilik platform**: semua tenant, semua role, termasuk record Tenant. Pakai hemat. Kerja harian ITSM tetap di admin / manager / SPV / agent.

---

## 1. Yang boleh dan tidak

| Boleh | Jangan (meski sistem mengizinkan) |
| --- | --- |
| `manage` semua subject termasuk **Tenant** | Menggunakan akun ini untuk mengerjakan antrian harian |
| Assign role apa pun, termasuk `superadmin` dan `admin` | Membuat banyak superadmin “cadangan” |
| Semua menu desk + Settings (Integrations, Notifications) | Pause/archive tenant produksi tanpa runbook |
| Melihat seluruh account di tenant lab | Commit `.env`, service_role, atau `OPS_TOKEN` |

Hanya role ini yang lolos CASL `Tenant` (`/tenants`, `GET/POST /api/tenants`). Admin **tidak** bisa membuat tenant atau mengubah status tenant lain.

---

## 2. Kapan login sebagai superadmin

- Tenant baru / ganti nama / accent / timezone / email support
- Pause tenant (insiden keamanan, non-bayar) atau archive
- Promote orang menjadi `admin` atau `superadmin`
- Audit lintas-peran ketika RBAC / RLS terlihat salah
- Cutover VPS + hosted Supabase — siapkan dulu [MIGRATE-SERVER.md](../MIGRATE-SERVER.md), lalu [SERVER.md](../SERVER.md)

Untuk plugin Groq/WA, user biasa, SLA, katalog: pakai **admin** atau **manager**. Jejak audit lebih jelas.

---

## 3. Tenant

`/tenants` — daftar klien. **New tenant** membuat workspace terisolasi + admin pertama.

| Field | Arti |
| --- | --- |
| Name / slug | Identitas platform. Login: `/login?tenant={slug}`. Backend: `/api/v1/t/{slug}` (template `{+origin}/api/v1/t/{tenant}`) |
| Accent color | Warna chrome desk/portal klien itu (tombol, nav, process strip). Halaman login tetap biru sampai sign-in |
| Timezone | Jam SLA / laporan |
| Support email | Alamat support yang tampil ke operasi |
| Status | `active` · `paused` · `archived` |
| Plan | `trial` (default +14 hari jika tanggal kosong) · `standard` · `enterprise` |
| Contract end | Tanggal akhir kontrak. Kosong = tidak kedaluwarsa |
| Grace days | Hari setelah kontrak berakhir sebelum login diblok (default 7) |
| Auto-pause | Worker menjeda tenant setelah grace. Data **tidak** dihapus |
| Protected | Flag di database. Tenant terlindungi tidak ikut expiry / tidak bisa di-pause. Lab `novacrm-demo` di-set dari seed, bukan hardcode ID |

Yang ikut dibuat: account **Internal**, group **Service Desk** L1, SLA office hours, admin sebagai lead.

`paused` / `archived` menolak login. Setelah `expires_at` + grace, login juga ditolak (`tenant_expired`) meski status masih active; worker lalu set `paused` jika auto-pause nyala. Tenant **protected** dan tenant tempat Anda sedang login **tidak** bisa di-pause.

Data tetap diisolasi `tenant_id`. Superadmin lab tetap di tenant demo; setelah create, **sign out** lalu login sebagai admin klien.

---

## 4. Users dan role

`/users` — Anda boleh set Access ke **semua** nilai:

`customer` · `agent` · `team_lead` · `supervisor` · `manager` · `admin` · `superadmin`

Aturan:

- Minimal **dua** admin tenant (bukan dua superadmin).
- Superadmin kedua hanya untuk break-glass.
- Jangan turunkan admin terakhir menjadi agent tanpa pengganti.

---

## 5. Integrasi, rahasia, Ops

Sama seperti admin, plus tanggung jawab platform:

- Keys hanya di **Integrations** / env VPS, bukan di tiket.
- Webhook: header `x-webhook-secret`, bukan query `?secret=`. Tolak secret `change-me-*`.
- Ops `:3100` loopback + `OPS_TOKEN` di VPS. Jangan publish 0.0.0.0.
- Worker: default 1; HA = 2. [WORKERS.md](../WORKERS.md).
- Backup: `./scripts/backup.sh`, restore drill `./scripts/restore.sh YYYYMMDD`.

Health: `GET /api/health` — Redis `up`, env lengkap.

---

## 6. Yang tetap didelegasikan

| Topik | Delegasi ke |
| --- | --- |
| Plugin AI / WA / email | Admin |
| Account customer, org, import, workflow | Manager |
| SLA, katalog, roster | SPV |
| Antrian, assign, escalate | Team Lead |
| Kerjakan tiket, aset, CMDB | Agent |
| Ajukan / lacak permintaan | Customer |

Anda *bisa* melakukan semua itu. Jangan — kecuali insiden platform.

---

## 7. Checklist superadmin

- [ ] Tenant status `active` kecuali ada alasan tertulis
- [ ] Kontrak klien diisi di `/tenants/{id}` (plan, tanggal akhir, grace); lab tetap **Protected**
- [ ] Klien baru dibuat dari `/tenants`, bukan copy tenant lab
- [ ] Ada admin tenant selain akun superadmin
- [ ] Tidak ada superadmin idle tanpa MFA/password produksi yang diganti (lab password `NovaCRM!2026` **wajib ganti** di produksi)
- [ ] `/api/health` OK setelah deploy
- [ ] Backup kemarin ada; restore pernah diuji
- [ ] Ops dan Redis tidak terekspos publik
- [ ] Login harian Anda bukan `superadmin@…` kecuali tugas platform
