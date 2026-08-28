# Capability Matrix

**Audience:** admin dan superadmin  
**UI:** `/settings/capabilities`

## Fungsi

Capability Matrix adalah halaman tenant-scoped untuk melihat dan mengatur
kemampuan role terhadap module. Matrix membagi izin menjadi:

- `manage`
- `create`
- `read`
- `update`
- `delete`

Module yang tersedia mengikuti subject CASL/NovaCRM: Ticket, Asset, CMDB,
Account, Organization, SLA, User, Workflow, Catalog, Governance, WFM,
Staff Review, Integrations, Tenant, Import, Knowledge, dan Capability Matrix.

## Hak akses

- `admin`: dapat membuka dan mengubah matrix tenant sendiri.
- `superadmin`: dapat membuka dan mengubah matrix tenant yang sedang aktif.
- `manager`, `supervisor`, `team_lead`, `agent`, dan `customer`: tidak dapat
  mengubah matrix.
- API akan mengembalikan `401 Unauthorized` untuk actor yang bukan admin atau
  superadmin.
- RLS database juga membatasi `insert`, `update`, dan `delete` pada
  `role_capabilities` dengan `is_tenant_admin()`.

UI permission bukan satu-satunya pengaman. RLS tetap menjadi boundary backend.

## Default dan override

Nilai **Default** berasal dari `lib/rbac/ability.ts`. Nilai **Override**
disimpan pada tabel `role_capabilities` untuk tenant tertentu. Cell dengan
override diberi penanda `O`.

Gunakan override secara konservatif:

1. Buka menu **Capability matrix**.
2. Pilih action pada dropdown.
3. Cari module dan role.
4. Klik cell `Allowed` atau `Denied`.
5. Validasi dengan login role terkait.

Jangan menonaktifkan akses admin/superadmin sebelum memastikan ada akun
break-glass yang tetap dapat memperbaiki konfigurasi.

## Audit dan operasi

Setiap row menyimpan `tenant_id`, `role`, `action`, `subject`, `allowed`,
`created_by`, `created_at`, dan `updated_at`. Perubahan dilakukan melalui:

```text
PATCH /api/rbac/capabilities
```

Contoh payload:

```json
{
  "role": "agent",
  "action": "update",
  "subject": "Catalog",
  "allowed": false
}
```

Setelah perubahan permission, lakukan smoke test:

- buka halaman yang terkait;
- uji dengan role target;
- uji kembali dengan admin;
- cek bahwa tenant lain tidak terpengaruh.
