# NovaCRM User Guide

**Audience:** staff operations (admin / agent) and portal customers  
**Purpose:** training pack for classroom or self-paced onboarding  
**Product version:** laptop demo (desk + portal + Ops)  
**Languages:** Bahasa Indonesia (this pack). Product chrome defaults to **ID**; toggle `EN | ID` on the top bar.

Setup satu klien end-to-end (tenant, account, divisi/dept, portal, arsip — tanpa hapus data): [Operasi tenant](tenant-operations.md). Produksi: [VPS.md](../VPS.md).

## Role playbooks (daily use)

Sembilan role produk. Pilih dokumen sesuai login.

| Role | Document | Home | Login lab |
| --- | --- | --- | --- |
| `customer` | [Pengguna — portal](user-operator.md#bagian-b--customer-portal) | `/portal` | `customer@novacrm.app` |
| `agent` (L1/L2/L3) | [Pengguna — desk](user-operator.md#bagian-a--agent-service-desk) | `/dashboard` | `agent@novacrm.app` |
| `pm_delivery` | [Delivery access model](../DELIVERY-ACCESS-MODEL.md) | `/delivery/dashboard` | `pm.delivery@novacrm.app` |
| `dco` | [Delivery access model](../DELIVERY-ACCESS-MODEL.md) | `/delivery/dashboard` | `dco@novacrm.app` |
| `team_lead` | [Team Lead / SPV](lead-spv.md) | `/dashboard` | `lead@novacrm.app` |
| `supervisor` | [Team Lead / SPV](lead-spv.md) | `/dashboard` | `spv@novacrm.app` |
| `manager` | [Manager operasi](manager-ops.md) | `/dashboard` | `manager@novacrm.app` |
| `admin` | [Administrator sistem](admin-system.md) | `/dashboard` | `admin@novacrm.app` |
| `superadmin` | [Superadmin platform](superadmin.md) | `/dashboard` | `superadmin@novacrm.app` |

Password lab semua: `NovaCRM!2026`.  
Item katalog: [Catalog & record producer](catalog-guidance.md). **Journey tenant & user:** [TENANT-USER-JOURNEY.md](../TENANT-USER-JOURNEY.md). **Journey ticketing:** [TICKETING-JOURNEY.md](../TICKETING-JOURNEY.md). **Journey WFM:** [WFM-JOURNEY.md](../WFM-JOURNEY.md). Major incident (induk–anak, bukan RCA): [Major incident](major-incident.md). GAMAS + CMDB impact: [GAMAS-CMDB-IMPACT.md](../GAMAS-CMDB-IMPACT.md). Matriks hak: [RBAC](../RBAC.md). Delivery: [Delivery Project](delivery.md).

## Classroom pack

| Document | Who it is for |
| --- | --- |
| [Tenant & user journey](../TENANT-USER-JOURNEY.md) | Superadmin/admin/manager: tenant, account, org, user, portal onboarding, import |
| [Ticketing journey](../TICKETING-JOURNEY.md) | Semua role: peta end-to-end INC/PRB/CHG/RITM, portal, desk, GAMAS, notifikasi |
| [WFM journey](../WFM-JOURNEY.md) | Agent/lead/SPV/manager: roster, presence, dispatch, swap, on-call, forecast, export |
| [Trainer guide](trainer-guide.md) | Facilitator: agenda, demo data, timing, pass criteria |
| [Participant manual](participant-manual.md) | Learners: procedures, labs, expected results |
| [Major incident](major-incident.md) | Agent/SPV: parent/child tickets, not RCA |
| [GAMAS CMDB impact](../GAMAS-CMDB-IMPACT.md) | Agent/customer: root CI, portal banner, subnet match, notifications |
| [Delivery Project](delivery.md) · [Alur proses](delivery-process.md) | PM/DCO/agent/customer: project, phases, work order, handover, hypercare, portal progress |
| [Task activity & WBS](task-activities.md) | PM/DCO/agent/customer: activity timeline, visibility, sequential dependencies |
| [Capability Matrix](capability-matrix.md) | Admin/superadmin: tenant capability configuration |
| [Delivery access model](../DELIVERY-ACCESS-MODEL.md) | Owner/admin/security: access PM Delivery, DCO, partner, portal, and CRM service |
| [SQL server — user access](../SERVER-USER-ACCESS.md) | Admin/engineer: inspect and update user role and account membership from the VPS |
| [Local setup](../LOCAL.md) | Engineer: run the app on a laptop |
| [Sysadmin Ops](../OPS.md) | Engineer: health and queues on `:3100` |
| [Workers](../WORKERS.md) | Engineer: scale BullMQ workers |
| [MFA](../MFA.md) | TOTP toggle — off until production |
| [Persiapan migrasi server](../MIGRATE-SERVER.md) | Engineer: akun, secret, DNS sebelum VPS |
| [Operasi tenant](tenant-operations.md) | Admin/manager: tenant → account → org → portal → arsip |
| [VPS go-live](../VPS.md) | Engineer: produksi `novacrm.click` |
| [Deployment](../DEPLOYMENT.md) | Engineer: VPS / production |
| [Delivery ↔ CRM](../DELIVERY-CRM-INTEGRATION.md) | Engineer/integration owner: webhook contract and account mapping |
| [Backup](../BACKUP.md) | Engineer: dump 02:00 WIB |
| [Restore](../RESTORE.md) | Engineer: latihan restore ke scratch |
| [Kesiapan operasional](../OPERATIONS.md) | Engineer: pilot vs produksi, kuota Free |
| [Demo E2E](../DEMO-E2E.md) | Presenter: skrip klik 35–70 menit |
| [Simulasi major incident](../DEMO-MAJOR-INCIDENT.md) | Parent/child Bank — 2 menit, bukan RCA |
| [Go-to-market](../GTM.md) | Penjualan: pesan, demo, trial |
| [Flyer www](../FLYER.md) | Landing `www.novacrm.click` |
| [Retensi log](../LOG-RETENTION.md) | Engineer: prune log Supabase + Docker |
| [Bisnis & campaign](../BUSINESS.md) | Owner: paket, funnel, analisis |
| [Ringkasan bisnis SaaS](../BUSINESS-SUMMARY.md) | Verdict jual cloud + paket MSP |
| [SOW / harga / outreach](../SOW-TEMPLATE.md) | SOW · [PRICING-MATRIX](../PRICING-MATRIX.md) · [OUTREACH-14D](../OUTREACH-14D.md) |

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
| PM Delivery | `pm.delivery@novacrm.app` | `/delivery/dashboard` |
| DCO | `dco@novacrm.app` | `/delivery/dashboard` |
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
