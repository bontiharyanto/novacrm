# SQL Server — User Access

Panduan ini digunakan untuk memeriksa dan mengatur role PM Delivery/DCO pada
database Supabase hosted dari VPS. Jalankan hanya pada database tenant yang
benar. Jangan menaruh `DATABASE_URL`, password, atau service key ke dalam file
atau chat.

## 1. Siapkan koneksi dari VPS

`select` adalah SQL, bukan perintah Bash. Dari VPS, masuk ke direktori aplikasi
lalu buat helper `db` berikut:

```bash
cd /opt/novacrm

set -a
. ./.env.production
set +a

db() {
  docker run --rm \
    -e DATABASE_URL="$DATABASE_URL" \
    postgres:17-alpine \
    psql "$DATABASE_URL" "$@"
}
```

Jika `DATABASE_URL` belum berisi `sslmode`, tambahkan `?sslmode=require` pada
nilai environment sesuai format connection string Supabase.

## 2. Pastikan migration role sudah diterapkan

```bash
DATABASE_URL="$DATABASE_URL" ./scripts/migrate.sh

db -c "select id, applied_at
from public.schema_migrations
where id = '20250828140000_delivery_roles.sql';"
```

Hasil query harus menampilkan satu baris. Migration ini membuat role
`pm_delivery` dan `dco`, helper RLS, serta policy Delivery.

## 3. Lihat semua user pada tenant

```bash
db -c "select id, full_name, email, role, tenant_id, created_at
from public.profiles
order by created_at, full_name;"
```

Untuk hanya melihat role Delivery:

```bash
db -c "select id, full_name, email, role
from public.profiles
where role in ('pm_delivery', 'dco')
order by full_name;"
```

## 4. Lihat account yang tersedia

```bash
db -c "select id, name, code, type, status
from public.accounts
order by name;"
```

Cari user dan account berdasarkan email:

```bash
db -c "select p.id as user_id, p.full_name, p.email, p.role,
       a.id as account_id, a.name as account_name, am.role as membership_role
from public.profiles p
left join public.account_members am on am.user_id = p.id
left join public.accounts a on a.id = am.account_id
where p.email = 'user@company.com'
order by a.name;"
```

## 5. Update role user existing

Gunakan UUID user dari query sebelumnya. Email dipakai sebagai contoh; ganti
dengan email sebenarnya.

```sql
update public.profiles
set role = 'pm_delivery'::public.app_role,
    updated_at = now()
where email = 'pm@company.com';
```

Untuk DCO:

```sql
update public.profiles
set role = 'dco'::public.app_role,
    updated_at = now()
where email = 'dco@company.com';
```

Periksa hasilnya:

```bash
db -c "select full_name, email, role
from public.profiles
where email in ('pm@company.com', 'dco@company.com');"
```

## 6. Tambahkan account membership

PM Delivery dan DCO wajib memiliki membership pada account delivery. Ganti
empat UUID placeholder berikut dengan nilai sebenarnya:

```sql
insert into public.account_members (
  tenant_id, account_id, user_id, role, created_by
)
values (
  'TENANT_UUID',
  'ACCOUNT_UUID',
  'USER_UUID',
  'member'::public.account_member_role,
  'ADMIN_USER_UUID'
)
on conflict (account_id, user_id) do update
set role = excluded.role;
```

Verifikasi membership:

```bash
db -c "select p.full_name, p.email, p.role,
       a.name as account_name, am.role as membership_role
from public.account_members am
join public.profiles p on p.id = am.user_id
join public.accounts a on a.id = am.account_id
where p.email in ('pm@company.com', 'dco@company.com')
order by p.full_name, a.name;"
```

## 7. Periksa capability baseline

Capability default berasal dari CASL di application. Query ini hanya
menampilkan override tenant yang tersimpan:

```bash
db -c "select role, action, subject, allowed
from public.role_capabilities
where role in ('pm_delivery', 'dco')
order by role, subject, action;"
```

Jangan memberi `manage` pada `Capability`, `Tenant`, `User`,
`NotificationSettings`, atau `NotificationLog` kepada PM Delivery/DCO.

## 8. Setelah update

1. Minta user logout lalu login kembali agar session role terbaru terbaca.
2. PM Delivery menguji `/delivery`, project, phase, dan progress customer.
3. DCO menguji Work Order, task, activity, dan dependency WBS.
4. Pastikan user hanya melihat account yang memiliki membership.
5. Jangan menjalankan `supabase/seed.sql` pada tenant production yang sudah
   memiliki data.

## Membuat user baru

SQL di atas hanya mengubah profile dan membership. Pembuatan identitas Auth
sebaiknya dilakukan melalui `/users` sebagai Admin atau Supabase Dashboard →
Authentication → Users. Setelah user dibuat, jalankan langkah 5 dan 6.
