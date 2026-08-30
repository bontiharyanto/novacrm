# Delivery Project

**Audience:** PM Delivery, DCO, agent, supervisor, dan customer portal  
**Status:** manual mode tersedia; CRM eksternal adalah tahap berikutnya  
**UI internal:** `/delivery/dashboard` (command center), `/delivery` (project list), dan panel **Task Activity** pada detail project
**UI customer:** `/portal/projects`
**Alur resmi:** [Delivery Project Process](delivery-process.md)

## Tujuan

Delivery Project dipakai setelah project berstatus **Closed Won** dan PM Delivery
ditunjuk. DCO mengubah project menjadi pekerjaan operasional berupa Work Order
dan task. Customer hanya melihat progres yang sudah ditandai aman untuk customer.

Pembagian tanggung jawab:

| Peran | Tanggung jawab |
| --- | --- |
| PM Delivery | Menjaga target, scope, dan koordinasi project |
| DCO | Membuat Work Order/Request dan mengontrol progres phase |
| Agent/team | Mengerjakan task dan mengisi activity |
| Customer | Melihat progres dan activity yang dipublikasikan |

## Urutan akses dan login

Gunakan akun sesuai pemilik langkah berikut:

- **PM Delivery** login ke `/delivery/dashboard` untuk memantau portfolio,
  membuat Delivery Project, mengelola phase, dan menyiapkan handover.
- **Manager/Admin** login ke `/dashboard` untuk membuat project bila
  diperlukan, lalu menetapkan PM Delivery dan DCO pada project.
- **DCO** login ke `/delivery/dashboard` untuk membuat Work Order/Request,
  membuat task, mengatur assignment, dan mengontrol eksekusi.
- **Agent/Delivery Team** login ke `/dashboard` untuk mengerjakan task dan
  mengisi Task Activity.
- **Customer** login ke `/portal` untuk melihat project, task, dan activity
  yang dipublikasikan.

Untuk akun demo dan password lab, lihat bagian [Demo logins](README.md#demo-logins).

## Alur manual sebelum CRM

1. Pastikan project sudah berstatus **Closed Won** dan PM Delivery sudah
   ditunjuk.
2. Login sebagai PM Delivery atau Manager/Admin. Buka `/delivery/dashboard`
   untuk command center, lalu `/delivery` untuk project list.
3. Pilih **customer account** yang benar, lalu isi nama project dan referensi
   internal/eksternal.
4. Pilih mode:
   - **Sequential:** task berjalan sesuai urutan dan predecessor harus selesai.
   - **Parallel:** task dapat dikerjakan bersamaan.
5. Klik **Create project**.
6. Manager/Admin menetapkan PM Delivery dan DCO bila assignment belum terisi.
7. Login sebagai DCO, buka project tersebut, lalu buat **delivery request**
   dari panel Work Order.
8. **Jangan membuat ticket terlebih dahulu** untuk alur delivery normal.
   Saat Work Order dibuat, sistem otomatis membuat Request ticket,
   menghubungkannya ke project, membuat task
   dari 7 phase standar, dan membuat dependency untuk mode sequential.
9. Pada detail Delivery Project, panel **Task Activity** menampilkan task dan
   activity per Work Order. Buka tombol **Activity** pada task yang relevan
   untuk membaca atau menambahkan update.
10. Setelah phase **Handover to Operation** selesai, PM/DCO melengkapi
   **Handover Checklist** lalu memilih **Kirim untuk review**.
11. Supervisor/Manager Operation mengisi **Operational Acceptance Record** dan
    memilih **Terima**, **Terima dengan kondisi**, atau **Tolak**.
12. Project masuk masa **Hypercare** selama 14 hari setelah acceptance. Project
    tidak dapat ditutup sebelum acceptance Operation dan hypercare selesai.

Untuk demo cepat, klik **Load sample project**. Tombol ini membuat project
contoh hanya untuk account yang dipilih dan tidak membutuhkan CRM eksternal.

## Phase standar

1. Determine customer order feasibility (Survey)
2. Allocate Resource & Service
3. Install & Activate Resource
4. Service Provisioning
5. Test Service End-to-End
6. CI Verification & Validation
7. Handover to Operation

Status phase: `planned`, `in_progress`, `blocked`, `completed`, `cancelled`.
Progress project dihitung dari phase completed/cancelled dibagi total phase.

## Handover to Operation

Checklist standar yang perlu dibuktikan oleh PM/DCO:

- scope dan acceptance criteria;
- CMDB dan asset record;
- runbook serta support guide;
- monitoring, alerting, dan escalation;
- production access dan ownership;
- backup serta rollback;
- known issue dan workaround;
- komunikasi customer serta support window.

Handover memiliki status `not_started`, `in_progress`, `under_review`,
`accepted`, `accepted_with_conditions`, atau `rejected`. Acceptance disimpan
sebagai review record dengan reviewer, waktu, dan catatan agar dapat diaudit.

Segregation of duties diterapkan: PM Delivery/DCO menyiapkan dan mengirim
checklist, sedangkan Operations (`supervisor`, `manager`, `admin`) memberikan
acceptance. Customer tidak melihat checklist internal atau catatan acceptance.

## Task Activity dan WBS

Pada detail Delivery Project, buka panel **Task Activity**, pilih Work Order,
lalu buka tombol **Activity** pada task yang relevan. Jalur alternatif tetap
tersedia melalui ticket Work Order → tab **Tasks**. Setiap task mempunyai
tombol **Activity** untuk:

- menulis progress note;
- mencatat blocker;
- mencatat keputusan;
- mencatat handover;
- menandai activity sebagai **Visible to customer**.

Status change task juga dicatat otomatis sebagai activity internal. Detail
lengkap: [Task activity & WBS](task-activities.md).

## Tampilan customer

Customer membuka `/portal/projects`. Portal menampilkan project yang memiliki
`account_id` yang sama dengan account membership customer. Customer melihat:

- nama project dan progress;
- phase yang `customer_visible`;
- status phase;
- Work Order dan task yang tersedia untuk portal;
- activity yang `customer_visible`.

Customer tidak dapat mengubah project, phase, task, activity, assignment, atau
dependency. Assignment internal, dependency detail, dan activity internal tidak
ditampilkan di portal.

## Jika portal kosong

Ini biasanya masalah mapping account, bukan masalah layout:

1. Catat account pada kartu project di `/delivery`.
2. Buka **Accounts → account tersebut → Members**.
3. Tambahkan user customer dengan role `portal`.
4. Logout/login kembali.
5. Pastikan project tidak dibuat pada account lain.

Agent dapat melihat banyak account karena account switcher/tenant scope.
Customer hanya boleh melihat account yang memang menjadi membership-nya.
Jangan mengatasi masalah ini dengan menghapus RLS.

## Checklist penerimaan

- [ ] PM Delivery dapat membuat project manual dari `/delivery`.
- [ ] PM Delivery melihat Portfolio view di `/delivery/dashboard`.
- [ ] DCO melihat Execution Control view di `/delivery/dashboard`.
- [ ] Sample project muncul pada account yang dipilih.
- [ ] DCO dapat membuat Request dari project.
- [ ] Request memiliki task phase standar.
- [ ] Panel Task Activity tampil langsung pada detail Delivery Project.
- [ ] Sequential menolak task sebelum predecessor selesai.
- [ ] Parallel tidak mengunci task lain.
- [ ] Agent dapat menambah activity.
- [ ] Activity internal tidak muncul di portal.
- [ ] Activity `customer_visible` muncul di portal.
- [ ] Task dan Work Order internal tidak bocor ke portal; hanya data yang
      diizinkan RLS dan `customer_visible` yang terlihat.
- [ ] Customer dari account berbeda tidak dapat melihat project.
- [ ] Checklist handover otomatis tersedia pada project delivery.
- [ ] Project tidak dapat ditutup sebelum Operations acceptance dan hypercare.
- [ ] Review record menyimpan reviewer, keputusan, waktu, dan catatan.
