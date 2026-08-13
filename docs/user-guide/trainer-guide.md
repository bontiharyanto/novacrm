# NovaCRM Trainer Guide

**Document type:** facilitator runbook  
**Duration options:** half day (3.5 h) or full day (6.5 h)  
**Class size:** 6–12 (pair on one laptop if needed)

---

## 1. Learning outcomes

By the end of training, a participant can:

1. Sign in with the correct role and switch **theme** / **language**.
2. Switch **account** (Internal / Bank Nusantara / Garuda) and explain why lists change.
3. Create, assign, hold, and escalate a ticket; read the SLA badge.
4. Record asset **move / transfer / replace** and open the related CI graph.
5. Submit a catalog request as a customer and find it on the desk.
6. (Admin only) Open **Integrations** and **Appearance**; know that API keys are never shown in class unless the lab environment is isolated.

Out of scope for this class: VPS deploy, GitHub Actions, writing SQL migrations.

---

## 2. Room setup (day before)

| Check | Done |
| --- | --- |
| Docker Desktop running | ☐ |
| `npm run local:setup` completed once | ☐ |
| `npm run local:dev` answers on port **3000** | ☐ |
| Optional: `npm run local:deploy` answers on port **3001** | ☐ |
| Projector shows 1280×800 or wider | ☐ |
| Demo accounts work (table in [README](README.md)) | ☐ |
| Mailpit open on a second window: http://127.0.0.1:54324 | ☐ |
| Printed or PDF participant manual | ☐ |

**Do not** paste production Groq / WhatsApp / Telegram keys into a shared classroom. Use the seeded local tenant only.

Write on the whiteboard:

```
Dev     http://localhost:3000
Docker  http://localhost:3001
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
| Ticket *Backup gagal* | Internal | Already escalated to L2 |
| SLA Gold INC P1 | `/sla` on Bank | 15m response / 4h resolve |

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
| 2:50–3:20 | Customer portal | Lab 7 |
| 3:20–3:35 | Recap + quiz | — |

### Full day (6.5 hours)

Add after lunch:

| Time | Module | Lab |
| --- | --- | --- |
| 3:45–4:20 | Organization, users, assignment groups | Lab 8 |
| 4:20–4:55 | SLA matrix + CAB | Lab 9 |
| 4:55–5:25 | Catalog + workflows (Standard template) | Lab 10 |
| 5:25–6:00 | Reports, Assistant, Governance (UU PDP) | Lab 11 |
| 6:00–6:30 | Admin: Integrations overview (no live keys) | Lab 12 |
| 6:30 | Q&A, parking lot | — |

---

## 5. Facilitation notes

**Language.** The UI can be **ID** or **EN**. Ask the room to pick one at the start (`EN | ID` on the top bar) so screenshots match. This pack uses **Indonesian narrative** and **English UI labels** in `code` (the default English chrome).

**Theme.** **Midnight** (dark) is default. **Daylight** is the light theme. Do not spend more than two minutes here.

**Keyboard.** `⌘K` / `Ctrl+K` command palette, `⌘N` / `Ctrl+N` new ticket. Show once; many agents will use it daily.

**Realtime.** Two browsers (admin + agent) on the same ticket: a status change should appear without refresh. If it does not, Redis is down — check `/api/health`.

**Parking lot.** Write integrations, inbound WhatsApp, and Prometheus alerts on a flipchart. Those are “day two” unless you run the full-day agenda.

---

## 6. Pass criteria (optional certificate)

Participant can complete **without facilitator clicking**:

1. Login as agent, switch to Bank Nusantara, open `AST-1001`.
2. Create an incident, assign to self, add a comment.
3. Login as customer, submit a catalog or freeform request, then find it as agent.

---

## 7. If something breaks

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser cannot open :3000 | Dev server not running | `npm run local:dev` |
| :3000 empty, :3001 works | They are on Docker URL | Point them to the URL on the board |
| Login loops to login | Supabase down | `npx supabase start` |
| Empty CMDB graph | Wrong account | Switch to **Bank Nusantara** |
| Redis `down` on `/api/health` | Compose not up | `npm run local:up` or `local:deploy` |
| Email “sent” but inbox empty | Looking at Gmail | Open Mailpit `127.0.0.1:54324` |

Engineer runbooks: [LOCAL.md](../LOCAL.md).
