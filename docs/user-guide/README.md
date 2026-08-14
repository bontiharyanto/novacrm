# NovaCRM User Guide

**Audience:** staff operations (admin / agent) and portal customers  
**Purpose:** training pack for classroom or self-paced onboarding  
**Product version:** laptop demo (desk + portal + Ops)  
**Languages:** Bahasa Indonesia (this pack). The product UI also supports English.

| Document | Who it is for |
| --- | --- |
| [Trainer guide](trainer-guide.md) | Facilitator: agenda, demo data, timing, pass criteria |
| [Participant manual](participant-manual.md) | Learners: procedures, labs, expected results |
| [Catalog & record producer](catalog-guidance.md) | Supervisor / admin: design items, variables, Install Antivirus walkthrough |
| [Local setup](../LOCAL.md) | Engineer: run the app on a laptop |
| [Sysadmin Ops](../OPS.md) | Engineer: health and queues on `:3100` |
| [Deployment](../DEPLOYMENT.md) | Engineer: VPS / production |

## Demo logins

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Admin | `admin@novacrm.app` | `NovaCRM!2026` | `/dashboard` |
| Agent | `agent@novacrm.app` | `NovaCRM!2026` | `/dashboard` |
| Customer | `customer@novacrm.app` | `NovaCRM!2026` | `/portal` |

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

1. Facilitator reads the trainer guide the day before class.
2. Print or share the participant manual (PDF from Markdown is fine).
3. Run labs in order. Do not skip **Account switcher** — most CMDB/asset demos are scoped to **Bank Nusantara**.
4. End with the portal lab so agents see the customer experience.
