# Delivery Project

**Audience:** PM Delivery, DCO, agent, supervisor, dan customer portal  
**Status:** manual mode tersedia; CRM eksternal adalah tahap berikutnya  
**UI internal:** `/delivery/dashboard` (command center), `/delivery` (project list)
**UI customer:** `/portal/projects`

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

## Alur manual sebelum CRM

1. Login dengan akun internal (`pm_delivery`, `dco`, `agent`, `team_lead`,
   `supervisor`, `manager`, `admin`, atau `superadmin`).
2. Buka `/delivery/dashboard` untuk command center, atau `/delivery` untuk
   project list.
3. Pilih **customer account** yang benar.
4. Isi nama project dan referensi internal/eksternal.
5. Pilih mode:
   - **Sequential:** task berjalan sesuai urutan dan predecessor harus selesai.
   - **Parallel:** task dapat dikerjakan bersamaan.
6. Klik **Create project**.
7. Buka project, lalu buat **delivery request** dari panel Work Order.
8. Sistem membuat Request ticket, menghubungkannya ke project, membuat task
   dari 7 phase standar, dan membuat dependency untuk mode sequential.

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

## Activity dan WBS

Pada ticket Work Order, buka tab **Tasks**. Setiap task mempunyai tombol
**Activity** untuk:

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
- activity yang `customer_visible`.

Customer tidak dapat mengubah project, phase, task, activity, assignment, atau
dependency. Detail internal PM/DCO dan Work Order tidak ditampilkan di portal.

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
- [ ] Sequential menolak task sebelum predecessor selesai.
- [ ] Parallel tidak mengunci task lain.
- [ ] Agent dapat menambah activity.
- [ ] Activity internal tidak muncul di portal.
- [ ] Activity `customer_visible` muncul di portal.
- [ ] Customer dari account berbeda tidak dapat melihat project.
