# Delivery Access Model

**Audience:** owner platform, admin, PM Delivery, DCO, security, dan
integration owner  
**Status:** baseline role sudah tersedia; project/account scoping dan governance
tetap wajib diterapkan

## Keputusan utama

Pisahkan **tenant**, **organization/group**, **account**, dan **project scope**.
Jangan membuat tenant baru hanya karena PM Delivery dan DCO adalah divisi yang
berbeda.

Gunakan aturan berikut:

- Divisi internal dalam satu perusahaan: **tenant yang sama + organization/group
  terpisah**.
- Partner/vendor eksternal yang mengerjakan project tertentu: **organization
  partner + akses project/account terbatas**.
- Perusahaan independen dengan kebutuhan legal, billing, atau isolasi penuh:
  **tenant terpisah**.

Urutan boundary dari paling kuat:

```text
Tenant → Account → Organization/Group → Project → Ticket/Task → Visibility
```

`tenant_id` adalah boundary data utama. `account_id` membatasi customer.
Organization/group membatasi tim delivery. Project dan ticket membatasi scope
pekerjaan. `customer_visible` menentukan informasi yang boleh keluar ke portal.

## Hak akses yang disarankan

### PM Delivery — Delivery Manager

Boleh:

- membaca project, phase, Work Order, task, dependency, dan activity pada
  portfolio/account yang ditugaskan;
- membuat dan memperbarui project, phase, milestone, target, dan delivery plan;
- melihat blocker dan status operasional;
- menyetujui activity atau progress yang akan dipublikasikan ke customer;
- membaca laporan delivery dan audit project.

Tidak boleh:

- mengelola seluruh user tenant;
- mengubah RBAC atau RLS;
- membaca/rotasi secret integrasi;
- mengubah billing, tenant setting, atau account membership tanpa delegasi;
- menghapus evidence/audit secara permanen.

### DCO — Delivery Controller

Boleh:

- membaca project dalam account/portfolio yang menjadi tanggung jawabnya;
- membuat Request/Work Order;
- membuat task dan dependency WBS;
- mengatur assignment delivery team;
- memperbarui status phase dan task;
- menulis activity internal dan mengajukan progress untuk publikasi;
- memonitor blocker, SLA, dan handover.

Tidak boleh:

- mengubah pemilik tenant;
- mengelola role atau capability;
- merotasi credential CRM;
- mengubah account membership customer;
- menyetujui perubahan komersial di luar scope delivery.

### Delivery Team — Task Executor

Boleh:

- membaca context project yang dibutuhkan untuk mengerjakan task;
- membaca ticket yang ditugaskan;
- memperbarui status task;
- menulis progress, blocker, decision, dan handover activity;
- mengunggah evidence melalui storage resmi.

Tidak boleh:

- mengubah scope atau phase project;
- membuat/menghapus account;
- mengubah customer membership;
- melihat catatan internal project lain;
- mempublikasikan informasi customer tanpa approval.

### Customer — Portal Viewer

Boleh:

- melihat project milik account-nya;
- melihat phase/task yang ditandai `customer_visible`;
- melihat activity yang ditandai `customer_visible`;
- membuat atau membalas ticket melalui portal sesuai kebijakan tenant.

Tidak boleh:

- melihat internal note, blocker sensitif, assignment internal, dependency
  detail, credential, audit internal, atau project account lain;
- mengubah phase, task status, assignee, atau capability.

### CRM Integration — Service Account

Gunakan service identity non-manusia yang:

- hanya menerima webhook yang ditandatangani;
- hanya mengirim event ke endpoint CRM yang dikonfigurasi;
- tidak dapat login ke dashboard;
- tidak mempunyai akses user administration atau RBAC;
- memiliki idempotency key, audit log, rotasi secret, dan expiry policy.

## Mapping terhadap role NovaCRM saat ini

Role `admin` dan `manager` terlalu luas untuk diberikan permanen kepada PM
Delivery atau DCO. `manager` mencakup account, organization, user, import, dan
workflow; `admin` juga mencakup tenant settings serta integrasi.

Role khusus yang tersedia:

- `pm_delivery`;
- `dco`;
- `agent` untuk delivery team/task executor;
- role partner terpisah bila vendor perlu login;
- service identity terpisah untuk CRM webhook.

Subject capability yang tersedia untuk role delivery:

```text
DeliveryProject, DeliveryPhase, WorkOrder, DeliveryTask,
TaskActivity, TaskDependency, DeliveryReport, DeliveryPublish,
DeliveryHandover, OperationalAcceptance
```

Capability matrix mengatur baseline action per role, tetapi belum menggantikan
account membership dan project allowlist. PM Delivery dan DCO tetap harus
memiliki membership pada account delivery yang relevan.

## Modul Operations yang dipisahkan

Modul Operations global memakai subject capability tersendiri:

```text
OperationsDashboard, OperationsReports, OperationsInsights,
OperationsAudit, OperationsServiceDesk, OperationsCab
```

Subject tersebut diberikan kepada role Operations (agent, team lead,
supervisor, manager, admin, dan superadmin) sesuai action-nya. `pm_delivery`
dan `dco` tidak mendapat akses default ke Dashboard Operations, Reports, AI
Insights, Audit, Service Desk umum, atau CAB. Mereka tetap dapat membuka
ticket yang tertaut ke delivery project melalui route detail ticket yang
terproteksi dan tetap mengikuti RLS tenant/account.

## Segregation of duties

Rekomendasi pemisahan:

- PM Delivery menyetujui scope dan publikasi customer.
- DCO mengontrol eksekusi dan assignment.
- Delivery team menjalankan task.
- PM Delivery/DCO menyiapkan Handover Checklist dan submit untuk review.
- Supervisor/Manager Operation membuat Operational Acceptance Record dan
  memutuskan accept, accept with conditions, atau reject.
- Admin mengelola user, policy, dan integrasi.
- Customer hanya membaca hasil yang dipublikasikan.

Untuk project berisiko tinggi, orang yang membuat Work Order tidak menjadi
satu-satunya approver closure. Project juga tidak boleh ditutup sebelum
Operations acceptance dan masa Hypercare selesai. Semua perubahan penting
harus tercatat pada audit/activity.

## Lifecycle akses

### Onboarding

1. Pastikan identitas dan organisasi asal user.
2. Tetapkan role paling kecil yang memenuhi pekerjaan.
3. Tambahkan account/project allowlist.
4. Aktifkan MFA.
5. Uji akses dengan akun tersebut, bukan dengan akun admin.

### Perubahan project

Saat user dipindahkan project atau account, cabut akses lama terlebih dahulu,
kemudian berikan scope baru. Jangan mengandalkan perubahan organization saja
untuk mencabut akses project.

### Project close dan offboarding

- cabut akses project saat handover/close;
- nonaktifkan akun partner setelah pekerjaan selesai;
- rotasi secret service account bila owner/vendor berubah;
- simpan audit log sesuai kebijakan retensi;
- lakukan review akses minimal quarterly.

## Checklist sebelum production

- [ ] PM Delivery dan DCO memakai akun individual.
- [ ] Tidak ada shared account atau credential yang dibagikan lewat chat.
- [ ] Organization/group delivery sudah dipetakan.
- [ ] Setiap user memiliki account/project scope yang jelas.
- [ ] Customer hanya memiliki membership pada account yang benar.
- [ ] Role khusus delivery sudah disetujui owner platform.
- [ ] `customer_visible` memiliki proses review.
- [ ] Webhook CRM memakai secret berbeda per tenant/provider.
- [ ] MFA, audit, offboarding, dan quarterly access review sudah berjalan.

