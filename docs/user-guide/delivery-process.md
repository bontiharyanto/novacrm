# Alur Delivery Project

Dokumen ini adalah alur operasional resmi untuk project setelah status
**Closed Won**. Portal customer hanya menjadi kanal pemantauan; pembuatan dan
pengendalian delivery dilakukan oleh PM Delivery, DCO, dan Operations.

## Urutan login dan pemilik proses

- **PM Delivery** membuka `/delivery/dashboard` untuk memantau portfolio,
  membuat project, mengelola phase, dan menyiapkan handover.
- **Manager/Admin** membuka `/dashboard` untuk membuat project bila diperlukan
  dan menetapkan PM Delivery serta DCO.
- **DCO** membuka `/delivery/dashboard` untuk membuat Work Order/Request,
  mengatur task, assignment, dependency, dan activity.
- **Agent/Delivery Team** membuka `/dashboard` untuk menjalankan task dan
  mengisi activity.
- **Customer** membuka `/portal` untuk memantau data delivery yang
  `customer_visible`.

## Alur end-to-end

```text
CRM / Sales: Closed Won
        ↓
PM Delivery ditunjuk dan scope dikonfirmasi
        ↓
PM Delivery / Manager membuat Delivery Project
        ↓
Manager/Admin menetapkan PM Delivery dan DCO
        ↓
DCO membuat Request / Work Order
        ↓
Task phase + WBS dependency dibuat
        ↓
Team mengerjakan task dan mencatat activity/evidence
        ↓
Phase Handover to Operation selesai
        ↓
PM/DCO melengkapi Handover Checklist
        ↓
Submit → Operations Review
        ├─ Reject → perbaikan checklist → submit ulang
        ├─ Accept with conditions → Hypercare
        └─ Accept → Hypercare
                         ↓
                 Hypercare 14 hari
                         ↓
                 Formal project closure
                         ↓
                 BAU Operation
```

## Tahapan dan pemilik proses

### 1. Closed Won dan penunjukan owner

CRM atau Sales menjadi sumber status komersial **Closed Won**. PM Delivery
ditunjuk sebagai owner koordinasi delivery. Pada mode manual, Manager atau PM
Delivery dapat memasukkan project dari `/delivery`.

Output:

- customer account sudah benar;
- nama dan referensi project tersedia;
- PM Delivery dan DCO ditetapkan;
- target mulai dan selesai tersedia bila sudah diketahui.

### 2. Delivery setup oleh DCO

DCO membuka project dan membuat **Request / Work Order**. Untuk alur delivery
normal, ticket tidak dibuat lebih dahulu. NovaCRM otomatis membuat ticket
delivery yang terhubung ke project, lalu menyiapkan tujuh phase standar:

1. Feasibility / Survey;
2. Allocate Resource & Service;
3. Install & Activate Resource;
4. Service Provisioning;
5. Test Service End-to-End;
6. CI Verification & Validation;
7. Handover to Operation.

Mode `sequential` membuat dependency finish-to-start. Mode `parallel`
memungkinkan task yang tidak memiliki dependency berjalan bersamaan.

### 3. Eksekusi dan kontrol

Agent atau delivery team mengerjakan task dan mengisi activity berupa progress,
blocker, decision, atau handover. Activity dapat dikelola langsung dari panel
**Task Activity** pada detail Delivery Project; jalur alternatifnya adalah
ticket Work Order → tab **Tasks**. DCO mengontrol status, dependency,
assignment, dan blocker. PM Delivery memantau target, scope, risiko, serta
kesiapan customer communication.

Activity yang diberi tanda `customer_visible` dapat tampil di portal. Catatan
internal, dependency detail, assignment internal, dan evidence sensitif tetap
berada di internal desk.

### 4. Persiapan handover

Setelah pekerjaan teknis dan phase **Handover to Operation** siap, PM/DCO
melengkapi checklist berikut:

- scope dan acceptance criteria;
- CMDB dan asset record;
- runbook serta support guide;
- monitoring, alerting, dan escalation;
- production access dan ownership;
- backup serta rollback;
- known issue dan workaround;
- komunikasi customer serta support window.

Semua item wajib harus selesai sebelum tombol **Submit for review** tersedia.

### 5. Operational acceptance

Submit membuat status handover menjadi `under_review`. Supervisor, Manager,
Admin, atau Superadmin yang mewakili Operations melakukan review melalui
**Operational Acceptance Record**:

- `accept`: handover diterima tanpa kondisi;
- `accept_with_conditions`: diterima dengan tindak lanjut yang tercatat;
- `reject`: dikembalikan ke PM/DCO dengan alasan perbaikan.

Reviewer dan waktu review disimpan sebagai audit history. PM Delivery atau DCO
tidak dapat memberikan acceptance atas handover yang mereka siapkan.

### 6. Hypercare dan closure

Acceptance memulai periode **Hypercare 14 hari**. Project tetap terbuka selama
periode ini walaupun seluruh phase teknis sudah selesai. Setelah hypercare
berakhir, owner yang berwenang dapat memilih **Close project**.

Backend juga menolak perubahan status project menjadi `completed` apabila:

- belum ada Operations acceptance;
- acceptance masih `under_review` atau `rejected`; atau
- periode hypercare belum selesai.

Project yang sudah ditutup masuk ke **BAU Operation**. Perubahan setelah
closure dibuat sebagai incident, request, problem, atau change baru sesuai
kebijakan Operations.

## Status penting

| Objek | Status |
| --- | --- |
| Phase | `planned`, `in_progress`, `blocked`, `completed`, `cancelled` |
| Handover | `not_started`, `in_progress`, `under_review`, `accepted`, `accepted_with_conditions`, `rejected` |
| Project closure | hanya setelah handover accepted dan hypercare selesai |

## Batas portal customer

Customer dapat melihat nama project, progress, Work Order/task yang tersedia,
phase yang `customer_visible`, dan activity yang `customer_visible` pada
`/portal/projects`. Customer tidak dapat membuat Delivery Project, mengubah
phase/task/activity, melihat checklist handover, melihat Operational Acceptance
Record, atau menutup project. Assignment internal, dependency detail, dan
activity internal tetap tersembunyi.

## Mode integrasi CRM berikutnya

Saat integrasi CRM Work Order diaktifkan, langkah Closed Won, account mapping,
project, dan Work Order dapat datang dari webhook yang tervalidasi. Alur
eksekusi, checklist handover, Operations acceptance, hypercare, dan customer
visibility tetap dikendalikan oleh NovaCRM.

