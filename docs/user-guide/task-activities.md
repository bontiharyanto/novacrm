# Task Activity & WBS

**Audience:** DCO, PM Delivery, agent, supervisor  
**Parent process:** [Delivery Project](delivery.md)

## Konsep

`ticket_tasks` adalah unit pekerjaan. `task_activities` adalah jurnal perubahan
dan komunikasi pada unit pekerjaan tersebut. Satu task dapat memiliki banyak
activity, sehingga progress tidak hanya bergantung pada dropdown status.

Jenis activity:

| Jenis | Kapan digunakan |
| --- | --- |
| `progress` | Kemajuan pekerjaan atau hasil langkah |
| `comment` | Catatan umum |
| `blocker` | Kendala yang menghentikan pekerjaan |
| `decision` | Keputusan yang memengaruhi delivery |
| `status_change` | Perubahan status otomatis |
| `handover` | Serah terima ke tim operasi/customer |

## Cara menambahkan activity

1. Buka ticket Work Order.
2. Buka tab **Tasks**.
3. Klik **Activity** pada task yang relevan.
4. Pilih jenis activity.
5. Tulis catatan yang faktual dan singkat.
6. Centang **Visible to customer** hanya bila isi aman dipublikasikan.
7. Klik **Add update**.

Perubahan status `Start`, `Complete`, `Cancel`, atau update status dari phase
akan membuat activity `status_change` otomatis. Activity mencatat actor dan
waktu server.

## Aturan visibility

- Default activity adalah internal (`customer_visible = false`).
- Customer hanya dapat membaca task yang `customer_visible = true`.
- Customer hanya dapat membaca activity yang `customer_visible = true`.
- Jangan menaruh credential, IP internal, RCA sensitif, atau catatan vendor
  pada activity customer-visible.
- Activity yang sudah dipublikasikan tidak boleh dipakai untuk menyimpan
  percakapan internal lanjutan.

## Sequential dan parallel

Mode project menentukan perilaku eksekusi:

- **Sequential:** dependency `finish_to_start` dibuat di antara task phase.
  Task successor tidak dapat dimulai sebelum predecessor terminal.
- **Parallel:** task tidak otomatis saling mengunci.
- Dependency tetap dapat disimpan sebagai kontrol WBS dan dicek sebelum
  predecessor/successor dijalankan.

Dependency hanya boleh dibuat antar-task pada ticket yang sama dan task tidak
boleh bergantung pada dirinya sendiri.

## Data dan keamanan

Tabel utama:

- `ticket_tasks`: task, status, owner, urutan, project/phase link.
- `task_activities`: jurnal activity, actor, status transition, visibility.
- `task_dependencies`: predecessor, successor, dan dependency type.

Semua tabel memiliki `tenant_id`, audit timestamps, `created_by`, dan RLS.
Write activity/dependency hanya untuk staff. Portal memakai read-only policy.

## Endpoint internal

```text
GET  /api/tickets/{ticketId}/tasks/{taskId}/activities
POST /api/tickets/{ticketId}/tasks/{taskId}/activities
GET  /api/tickets/{ticketId}/tasks/{taskId}/dependencies
POST /api/tickets/{ticketId}/tasks/{taskId}/dependencies
```

Input activity:

```json
{
  "kind": "progress",
  "body": "Survey selesai dan feasibility sudah dikonfirmasi.",
  "customerVisible": true
}
```

Input dependency:

```json
{
  "predecessorTaskId": "uuid-task-sebelumnya",
  "dependencyType": "finish_to_start"
}
```

## Praktik baik

- Satu activity membahas satu kejadian.
- Gunakan blocker untuk kendala yang membutuhkan keputusan.
- Tambahkan keputusan final sebagai activity `decision`.
- Gunakan `handover` saat ownership berpindah.
- Upload evidence hanya setelah storage/evidence approval tersedia; jangan
  menaruh file binary langsung di database.
