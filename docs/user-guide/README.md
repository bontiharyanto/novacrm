# NovaCRM User Guide

**Audience:** staff operations (admin / agent) and portal customers  
**Purpose:** training pack for classroom or self-paced onboarding  
**Product version:** laptop demo (desk + portal + Ops)  
**Languages:** Bahasa Indonesia (this pack). Product chrome defaults to **ID**; toggle `EN | ID` on the top bar.

Setup satu klien end-to-end (tenant, account, divisi/dept, portal, arsip — tanpa hapus data): [Operasi tenant](tenant-operations.md). Produksi: [VPS.md](../VPS.md).

## Role playbooks (daily use)

Tujuh role produk. Pilih dokumen sesuai login.

| Role | Document | Home | Login lab |
| --- | --- | --- | --- |
| `customer` | [Pengguna — portal](user-operator.md#bagian-b--customer-portal) | `/portal` | `customer@novacrm.app` |
| `agent` (L1/L2/L3) | [Pengguna — desk](user-operator.md#bagian-a--agent-service-desk) | `/dashboard` | `agent@novacrm.app` |
| `team_lead` | [Team Lead / SPV](lead-spv.md) | `/dashboard` | `lead@novacrm.app` |
| `supervisor` | [Team Lead / SPV](lead-spv.md) | `/dashboard` | `spv@novacrm.app` |
| `manager` | [Manager operasi](manager-ops.md) | `/dashboard` | `manager@novacrm.app` |
| `admin` | [Administrator sistem](admin-system.md) | `/dashboard` | `admin@novacrm.app` |
| `superadmin` | [Superadmin platform](superadmin.md) | `/dashboard` | `superadmin@novacrm.app` |

Password lab semua: `NovaCRM!2026`.  
Item katalog: [Catalog & record producer](catalog-guidance.md). Matriks hak: [RBAC](../RBAC.md).

## Classroom pack

| Document | Who it is for |
| --- | --- |
| [Trainer guide](trainer-guide.md) | Facilitator: agenda, demo data, timing, pass criteria |
| [Participant manual](participant-manual.md) | Learners: procedures, labs, expected results |
| [Local setup](../LOCAL.md) | Engineer: run the app on a laptop |
| [Sysadmin Ops](../OPS.md) | Engineer: health and queues on `:3100` |
| [Workers](../WORKERS.md) | Engineer: scale BullMQ workers |
| [MFA](../MFA.md) | TOTP toggle — off until production |
| [Persiapan migrasi server](../MIGRATE-SERVER.md) | Engineer: akun, secret, DNS sebelum VPS |
| [Operasi tenant](tenant-operations.md) | Admin/manager: tenant → account → org → portal → arsip |
| [VPS go-live](../VPS.md) | Engineer: produksi `novacrm.click` |
| [Deployment](../DEPLOYMENT.md) | Engineer: VPS / production |
| [Backup](../BACKUP.md) | Engineer: dump 02:00 WIB |
| [Restore](../RESTORE.md) | Engineer: latihan restore ke scratch |
| [Kesiapan operasional](../OPERATIONS.md) | Engineer: pilot vs produksi, kuota Free |
| [Demo E2E](../DEMO-E2E.md) | Presenter: skrip klik 35–70 menit |
| [Retensi log](../LOG-RETENTION.md) | Engineer: prune log Supabase + Docker |

## Demo logins

Password lab: `NovaCRM!2026` (bukan produksi).

| Role | Email | Lands on |
| --- | --- | --- |
| Superadmin | `superadmin@novacrm.app` | `/dashboard` |
| Admin | `admin@novacrm.app` | `/dashboard` |
| Manager | `manager@novacrm.app` | `/dashboard` |
| Supervisor | `spv@novacrm.app` | `/dashboard` |
| Team lead | `lead@novacrm.app` | `/dashboard` |
| Agent | `agent@novacrm.app` | `/dashboard` |
| L1 / L2 / L3 / on-call | `sari.l1@` · `budi.l1@` · `raka.l2@` · `maya.l3@` · `andi.oncall@novacrm.app` | `/dashboard` |
| Customer | `customer@novacrm.app` | `/portal` |

## URLs (laptop)

| What | URL |
| --- | --- |
| Dev (hot reload) | http://localhost:3000 |
| Docker production-like | http://localhost:3001 |
| Ops (sysadmin — not a class login) | http://127.0.0.1:3100 |
| Mailpit (outbound email) | http://127.0.0.1:54324 |
| MinIO console | http://localhost:9001 |

Always tell the class **which URL** they should use before the first login.

## How to use this pack

1. Facilitator reads the trainer guide the day before class. For a short stakeholder walkthrough use [Demo E2E](../DEMO-E2E.md).
2. Print or share the participant manual (PDF from Markdown is fine).
3. Run labs in order. Do not skip **Account switcher** — most CMDB/asset demos are scoped to **Bank Nusantara**.
4. End with the portal lab so agents see the customer experience.
