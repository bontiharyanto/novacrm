
# NovaCRM Trainer Guide

**Document type:** facilitator runbook  
**Companion:** [Participant manual](participant-manual.md) · daily role playbooks: [Admin](admin-system.md) · [User](user-operator.md) · [Team Lead / SPV](lead-spv.md) · [Manager](manager-ops.md) · [Superadmin](superadmin.md)  
**Duration options:** half day (3.5 h) or full day (6.5 h)  
**Class size:** 6–12 (pair on one laptop if needed)

---

## 1. Learning outcomes

By the end of training, a participant can:

1. Sign in with the correct role and switch **theme** / **language** (`EN | ID` on the top bar). Default language is **ID**.
2. Switch **account** (Internal / Bank Nusantara / Garuda) and explain why lists change.
3. Create, assign, hold, and escalate a ticket; read the SLA badge.
4. Record asset **move / transfer / replace** and open the related CI graph.
5. Submit a catalog request as a customer and find it on the desk.
6. After an agent **resolves** a ticket, open the CSAT link from Mailpit (or `/portal/{id}`) and submit a score.
7. (Admin only) Open **Integrations** and **Appearance**; know that API keys are never shown in class unless the lab environment is isolated.
8. (Full day) Open **AI Insights** and **WFM** and explain they are read/dispatch tools, not ticket editors. Superadmin: show tenant **accent** on `/tenants`.

Out of scope for this class: VPS deploy, GitHub Actions, writing SQL migrations, the Ops console on `:3100` (engineer only).

---

## 2. Room setup (day before)

| Check | Done |
| --- | --- |
| Docker Desktop running | ☐ |
| `npm run local:setup` completed once | ☐ |
| `npm run local:dev` answers on port **3000** | ☐ |
| Optional: `npm run local:deploy` answers on port **3001** | ☐ |
| Ops console answers on **3100** (engineer check only) | ☐ |
| Projector shows 1280×800 or wider | ☐ |
| Demo accounts work (table in [README](README.md)) | ☐ |
| Mailpit open on a second window: http://127.0.0.1:54324 | ☐ |
| Printed or PDF participant manual | ☐ |

**Do not** paste production Groq / WhatsApp / Telegram keys into a shared classroom. Use the seeded local tenant only.

Write on the whiteboard:

```
Dev     http://localhost:3000
Docker  http://localhost:3001
Ops     http://127.0.0.1:3100   (trainer/engineer only)
Admin   admin@novacrm.app  /  NovaCRM!2026
Agent   agent@novacrm.app  /  NovaCRM!2026
Portal  customer@novacrm.app / NovaCRM!2026
```

---

## 3. Demo data to memorize

| Item | Where | Why you show it |
| --- | --- | --- |
| Account **Bank Nusantara** | Sidebar account switcher | CMDB topology + AST-1001 movement history |
| Asset `AST-1001` | Assets | Jakarta HQ → Lt. 3, Finance → Operations |
| CMDB Bank | CMDB graph | WAN Indosat → firewall → core → Lt.2 AP, VLAN 50 |
| Ticket *WiFi lantai 2* | Bank incidents | Vendor hold (SLA paused) |
| Ticket *Backup gagal* | Internal | Problem RCA: workaround + Known error; linked from *AC ruang server panas* |
| Knowledge *VPN disconnect* | `/knowledge` | Hint appears when creating a ticket titled with `VPN` |
| SLA Gold INC P1 | `/sla` on Bank | 15m response / 4h resolve |
| Catalog **Install software** | `/catalog` | Record producer — state badge is **Published** / **Draf**. Walkthrough for a new item (Antivirus) is in [catalog-guidance.md](catalog-guidance.md) |
| CSAT after resolve | Mailpit → `/portal/{id}` | Email/WA say **Nilai perbaikannya** (ID) or **Rate the fix** (EN). Desk URL is wrong — must be portal |

If a participant “cannot see the graph”, they are still on **Internal**. Switch account first.

---

## 4. Agenda

### Half day (3.5 hours)

| Time | Module | Lab |
| --- | --- | --- |
| 0:00–0:20 | Product map, roles, login, Appearance | Lab 1 |
| 0:20–1:10 | Service desk, filters, new ticket, SLA | Labs 2–3 |
| 1:10–1:20 | Break | — |
| 1:20–2:10 | Hold, escalate, comments, attach | Lab 4 |
| 2:10–2:50 | Assets + CMDB (Bank Nusantara) | Labs 5–6 |
| 2:50–3:20 | Customer portal + CSAT | Lab 7 |
| 3:20–3:35 | Recap + quiz | — |

### Full day (6.5 hours)

Add after lunch:

| Time | Module | Lab |
| --- | --- | --- |
| 3:45–4:20 | Organization, users, assignment groups | Lab 8 |
| 4:20–4:55 | SLA matrix + CAB | Lab 9 |
| 4:55–5:25 | Catalog + workflows (Standard template) | Lab 10 |
| 5:25–5:50 | Reports, Assistant, AI Insights | Lab 11 |
| 5:50–6:10 | WFM occupancy + roster (read-only unless isolated) | Lab 11b |
| 6:10–6:30 | Admin: Integrations (no live keys). Superadmin: `/tenants` accent | Lab 12 |
| 6:30 | Q&A, parking lot | — |

---

## 5. Facilitation notes

**Language.** Default chrome is **ID** (`novacrm_locale`). Ask the room to pick **ID** or **EN** at the start (`EN | ID` on the top bar) so screenshots match. Role playbooks use Indonesian narrative. Desk labels to point at: **Tiket baru**, **Insiden**, **Grup assignment**, **Published** / **Draf**. Ticket *body* stays as typed. Assistant and AI Insights follow the same toggle — start a new chat after switching. Email/WA in Mailpit follow the locale of the browser that created or resolved the ticket (default ID).

**Theme.** **Midnight** (dark) is default. **Daylight** is the light theme. Primary buttons and the process strip use the **tenant accent** (lab default blue). Superadmin changes it on `/tenants` — login page stays blue until sign-in. Do not spend more than two minutes here.

**Keyboard.** `⌘K` / `Ctrl+K` command palette, `⌘N` / `Ctrl+N` new ticket. Show once; many agents will use it daily.

**Realtime.** Two browsers (admin + agent) on the same ticket: a status change should appear without refresh. If it does not, Redis is down — check `/api/health`.

**Parking lot.** Write integrations, inbound WhatsApp, and Prometheus alerts on a flipchart. Those are “day two” unless you run the full-day agenda.

---

## 6. Pass criteria (optional certificate)

Participant can complete **without facilitator clicking**:

1. Login as agent, switch to Bank Nusantara, open `AST-1001`.
2. Create an incident, assign to self, add a comment.
3. Login as customer, submit a catalog or freeform request, then find it as agent.
4. Resolve that ticket as agent, open Mailpit, click the CSAT / portal link, submit a score as customer.
5. (Full day / catalog owners) Open **Install software** on `/catalog` and, using [catalog-guidance.md](catalog-guidance.md), explain how they would add **Install Antivirus**. State must be **Published** before the portal combo shows it.

---

## 7. If something breaks

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser cannot open :3000 | Dev server not running | `npm run local:dev` |
| :3000 empty, :3001 works | They are on Docker URL | Point them to the URL on the board |
| :3000 died after a hang / Ctrl+C | `local:dev` trap stopped Next.js | Start `npm run local:dev` again (or `npm run dev` if Ops/Docker already hold :3100) |
| Ops :3100 down | Host Ops killed when Docker deployed | Open http://127.0.0.1:3100 — Docker Ops should answer |
| Login loops to login | Supabase down | `npx supabase start` |
| Empty CMDB graph | Wrong account | Switch to **Bank Nusantara** |
| Redis `down` on `/api/health` | Compose not up | `npm run local:up` or `local:deploy` |
| Email “sent” but inbox empty | Looking at Gmail | Open Mailpit `127.0.0.1:54324` |
| CSAT link opens `/tickets/...` | Old email / wrong env | Resolve again; the link must be `/portal/{id}` |
| Email still English on an ID desk | Ticket was created while chrome was EN, or worker stale | Toggle **ID**, resolve again; restart `npm run worker` if needed |
| Accent still blue after `/tenants` save | Login page, or cache | Sign in to that tenant’s desk/portal and refresh |

Engineer runbooks: [LOCAL.md](../LOCAL.md).
