# NovaCRM Participant Manual

**Document type:** end-user procedures for classroom and self-study  
**Companion:** [Trainer guide](trainer-guide.md) · role playbooks: [Admin](admin-system.md) · [User](user-operator.md) · [Team Lead / SPV](lead-spv.md) · [Manager](manager-ops.md) · [Superadmin](superadmin.md)  
**UI:** default chrome is **ID**. Switch `EN | ID` on the top bar. Ticket *body* stays as typed. Email/WA and Assistant follow the same locale.

---

## Conventions

| Notation | Meaning |
| --- | --- |
| **Bold** | Button, menu, or page title |
| `Code` | Exact UI string, ID, or email |
| Sidebar → **Tickets** | Click that item in the left navigation |
| Expected | What you should see if the step worked |

---

## 1. What NovaCRM is

NovaCRM is the operations desk for IT service management. The staff sidebar has four groups:

- **Overview** — Dashboard, WFM, Reports, AI Insights, Audit. **Tanya AI** is the top-bar / floating Nova Agent (not a sidebar item).
- **Service desk** — incidents, problems, changes, CAB, requests
- **Configuration** — accounts, organization, users, SLA, assets, CMDB, import
- **Platform** — catalog, automation (workflows), governance (UU PDP)
- **Portal** — what the customer sees (separate login)

Every record is isolated by **tenant**. On this demo tenant you also switch **account** (customer scope): Internal, Bank Nusantara, Garuda, or **All**. Tickets, assets, and CMDB follow the active filter.

### Roles

| Role | Typical job | Home |
| --- | --- | --- |
| `customer` | Request service, track tickets, privacy (if enabled) | `/portal` |
| `agent` | Work tickets, assets, CMDB | `/dashboard` |
| `team_lead` | Assign, escalate, read users and WFM | `/dashboard` |
| `supervisor` | SLA, WFM roster, catalog | `/dashboard` |
| `manager` | Accounts, org, users, import, workflows | `/dashboard` |
| `admin` | Tenant settings and integrations | `/dashboard` |
| `superadmin` | Platform — all tenants | `/dashboard` |

Classroom logins are **admin**, **agent**, and **customer**. An agent cannot open **Integrations** (`/settings`). They can open **Appearance**.

---

## 2. Sign in and workspace

### 2.1 Sign in

1. Open the URL the trainer wrote on the board (dev **3000** or Docker **3001**).
2. Enter email and password.
3. Select **Sign in**.

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@novacrm.app` | `NovaCRM!2026` |
| Agent | `agent@novacrm.app` | `NovaCRM!2026` |
| Customer | `customer@novacrm.app` | `NovaCRM!2026` |

**Expected:** admin/agent land on **Dashboard**. Customer lands on **Portal**.

Sign out: icon at the bottom of the sidebar (staff) or **Sign out** on the portal header.

### 2.2 Theme and language

On the top bar:

- Moon = **Midnight** (dark)
- Sun = **Daylight** (light)
- `EN` / `ID` = interface language

Full page: Sidebar → **Appearance** (`/settings/appearance`).

Preference is stored in a browser cookie (`novacrm_theme`, `novacrm_locale`). It does not use local storage. Primary buttons follow the **tenant accent** (superadmin sets it on `/tenants`). The login page stays default blue until you sign in.

### 2.3 Account switcher

Under the NovaCRM logo, open **Account**.

| Account | Use in class |
| --- | --- |
| Internal | Default desk, L2/L3 groups |
| Bank Nusantara | Asset movement + network topology |
| Garuda | Second customer scope |
| All | Combined desk filter (cookie `novacrm_account=all`) |

**Expected:** ticket, asset, and CMDB lists change when you switch. If a lab says “open Bank graph” and you still see Internal, switch account first.

### 2.4 Command palette

Press `⌘K` (macOS) or `Ctrl+K` (Windows). Type a page name or a ticket number. Press Enter.

New ticket: `⌘N` / `Ctrl+N`, or the blue **New ticket** button.

---

## 3. Service desk

Sidebar group **Service desk**:

| Item | Process |
| --- | --- |
| **Incidents** | Unplanned interruption (`INC…`) |
| **Problems** | Root cause (`PRB…`) |
| **Changes** | Controlled change (`CHG…`) |
| **CAB** | Change Advisory Board queue |
| **Requests** | Catalog / access (`RITM…`) |
| **All tickets** | Every process |

### 3.1 Queue filters

On the ticket list:

| Filter | Meaning |
| --- | --- |
| **All** | Everything in the active account |
| **Mine** | Assigned to you |
| **My groups** | Queued to an assignment group you belong to |
| **Unassigned** | No assignee |

Views: **List** (table) or **Board** (Kanban). Drag a card on the board to change status.

KPI chips: **In queue**, **New**, **Unassigned**, **SLA risk**.

### 3.2 Create a ticket

1. **New ticket** (or `⌘N`).
2. Choose type: Incident / Problem / Change / Request.
3. Fill title, description, priority (`low` / `medium` / `high` / `critical`).
4. Optional: link an asset or CI, set requester.
5. Save.

**Expected:** the record opens with a number such as `INC0000005`. The process strip at the top shows the lifecycle for that type.

### 3.3 Work a ticket (detail)

The page is a **70 / 30** split: conversation on the left, properties on the right.

Typical agent actions:

| Action | When |
| --- | --- |
| **Assign to me** | You take ownership |
| Change **status** | Move along the process strip |
| Add a **comment** | Rich text; requester/assignee can be notified |
| Attach a file | Upload uses MinIO (not the Next.js server) |
| Link asset / CI | Impact and history |
| **Hold** | Pause SLA (waiting on vendor/customer). Needs a reason, e.g. `Pending vendor` + case number |
| **Escalate L2 / L3** | Queue to Internal `L2 Network` / `L3 Infra`. Clock **keeps running** |

Priorities: `low`, `medium`, `high`, `critical`.  
Statuses (incident): `open` → `in_progress` → `waiting` / `hold` → `resolved` → `closed`.

### 3.4 SLA badge

The badge counts down **response** and **resolve** targets copied from the account’s SLA matrix when the ticket was created.

| State | Meaning |
| --- | --- |
| On track | Inside target |
| Risk | Close to breach |
| Breached | Target missed |
| Paused | Ticket on **hold** / waiting — clock stopped |

**Demo:** switch to **Bank Nusantara** → SLA page shows Gold INC P1 **15 minutes / 4 hours**. Open Bank ticket *WiFi lantai 2* for a vendor hold. Open Internal *Backup gagal* for an L2 escalation.

---

## Lab 1 — Workspace

1. Login as **agent**.
2. Set language to `ID`, then back to `EN` (or the language the trainer chose).
3. Toggle **Daylight**, then back to **Midnight**.
4. Switch account **Internal** → **Bank Nusantara** → **Internal**.

**Pass:** lists change with the account; theme/language persist after refresh.

## Lab 2 — Find work

1. Sidebar → **Incidents**.
2. Filter **Unassigned**, then **Mine**.
3. Switch **List** / **Board**.

**Pass:** counts on the chips match the rows you see.

## Lab 3 — Create an incident

1. `⌘N` → type Incident.
2. Title: `Lab — printer floor 3`.
3. Priority `medium`. Save.
4. **Assign to me**. Add a comment: `Taken in training`.

**Pass:** number `INC…` exists; you are assignee; comment is visible.

## Lab 4 — Hold and escalate

1. Open your lab incident.
2. **Hold**, reason `Pending vendor`, note a fake case number. Check SLA shows paused.
3. Resume / move to in progress.
4. **Escalate L2**. Confirm group is `L2 Network` (Internal).

**Pass:** hold pauses SLA; escalate does **not** pause SLA.

---

## 4. Assets

Sidebar → **Assets**.

Assets are the hardware/software master **before** they become CIs.

| Field | Notes |
| --- | --- |
| Type | Dropdown is **user-addable** (laptop, server, network, printer, mobile, or type a name and **+**) |
| Asset tag | Unique; QR is generated on the detail page |
| Status | `active`, `in_repair`, `retired`, `lost` |
| Location / assigned to | Drive movement history |

### 4.1 Movement

On the asset detail (70 / 30):

| Button | Records |
| --- | --- |
| **Move** | Location change |
| **Transfer** | Assignee / owner change |
| **Replace** | Retire this asset and point to a successor |

**Demo:** Account **Bank Nusantara** → `AST-1001` (laptop). History: Jakarta HQ → Lt. 3, then Finance → Operations.

CSV **bulk import** is on the assets list (admin/agent).

## Lab 5 — Asset movement

1. Switch account to **Bank Nusantara**.
2. Open `AST-1001`.
3. Read the timeline (do not invent extra moves unless the trainer asks).
4. Optional: **Move** to a training location, then move back.

**Pass:** timeline shows at least the seeded Jakarta HQ → Lt. 3 path.

---

## 5. CMDB

Sidebar → **CMDB**.

A **configuration item (CI)** links assets and shows **relationships** (graph). Scope is **per account** (and tenant). This is an operations CMDB for the desk — not Discovery, not 1 200 CI classes.

**Demo path (Bank Nusantara):** WAN Indosat → firewall → core → Lt.2 access point. Segment example: `10.20.50.0/24` VLAN 50.

**Impact** on a CI shows related CIs plus tickets/assets that share the linked `asset_id`. There is no direct ticket→CI field. Empty impact usually means the ticket is not linked to that asset.

**Do not** rewrite the seeded Bank / Garuda / Internal topology or system CI classes. **New CI** is OK with a unique lab name. Relations are set at create; the detail page does not edit the graph edges. Filter **All** mixes accounts — use it for a count, not for the demo graph.

### 5.1 New CI

1. **New CI** (switcher must be a single account, not **All**).
2. Pick a class card (server, network, …). **Add card** if the class does not exist (e.g. CCTV).
3. Fill site, network role, CIDR / VLAN / gateway as required.
4. Save. Open the CI to add segments and inspect **impact**.

## Lab 6 — Topology

1. Stay on **Bank Nusantara** (Internal graph is a different, smaller set).
2. Open **CMDB** → graph view.
3. Click the Lt.2 AP node. Note VLAN / CIDR in the side panel.

**Pass:** you can name WAN → FW → core → AP without looking at this page.

---

## 6. Organization, users, SLA

### 6.1 Organization

`/org` — internal units (divisi) vs **assignment groups**. Tickets can queue to a group. Filter **My groups** on the desk.

Levels **L1 / L2 / L3** come from group membership, not from a free-text field on the user alone.

### 6.2 Users

`/users` — admin creates logins. Lost TOTP: open the staff profile → **Reset authenticator** after an identity check.

| Field | Meaning |
| --- | --- |
| Access | `customer` / `agent` / `team_lead` / `supervisor` / `manager` / `admin` / `superadmin` |
| Level | L1/L2/L3 from groups |
| Home unit | Organization unit |

### 6.3 SLA

`/sla` — matrix **ticket type × priority** per account, plus calendar. New tickets **snapshot** the agreement (later matrix edits do not rewrite old tickets). **Underpinning contracts** on the same page are vendor/principal UCs (Fortinet TAC, Indosat circuit). Link them on the assignment group at `/org`.

**Waiting** and **hold** pause the clock. Escalation does not.

## Lab 8 — Groups (full day)

1. `/org` — find `L2 Network` and `L3 Infra`.
2. `/users` — open the agent user and see group membership.
3. `/sla` — switch to Bank, read Gold INC P1.

---

## 7. Changes and CAB

Changes use process states including **CAB Review**.

`/cab` — review queue and calendar. On the change record: **approve** / **reject** / **defer**.

## Lab 9 — CAB (full day)

1. Sidebar → **Changes** or **CAB**.
2. Open one change in CAB review.
3. Read the calendar. Do not approve unless the trainer says so (shared demo data).

---

## 8. Catalog and portal

Full field-by-field guide (including **Install Antivirus**): [Catalog & record producer](catalog-guidance.md).

### 8.1 Agent catalog

`/catalog` — catalog items, **variable sets**, record producer type. Customers fill variables when they request.

| Creates | When to use |
| --- | --- |
| **Request** | Approved service (software, access, hardware) |
| **Incident** | Optional outage template — do not force |
| **Change** | Standard change templates only |
| **Problem** | Do not use a catalog item |

### 8.2 Customer portal

Login as `customer@novacrm.app`.

| Link | Use |
| --- | --- |
| **My tickets** | Track existing work |
| **Catalog** | Structured request (record producer) |
| **New request** | Freeform ticket |
| **Privacy** | Privacy notice and DSAR (only after admin **Enable on portal**) |

## Lab 7 — Portal round-trip

1. Sign out. Login as **customer**.
2. **Catalog** — submit one item **or** **New request** with title `Portal lab — access card`.
3. Sign out. Login as **agent**.
4. Find the new request on **Requests** / **All tickets**.

**Pass:** the customer ticket is visible on the desk with the same title.

---

## 9. Automation

`/workflows` → **New flow** → template:

| Template | Trigger | Idea |
| --- | --- | --- |
| **Standard** | `ticket.create` | Auto-assign |
| **Normal** | inbound message | Assign → in progress → email |
| **Complex** | machine alert | Condition: priority = critical |

Canvas: drag nodes. **Condition** nodes have Yes/No handles. **Recent runs** shows BullMQ execution.

Inbound (engineer-assisted, not a user lab unless full day):

| Channel | Route |
| --- | --- |
| WhatsApp | `POST /api/webhooks/whatsapp` |
| Telegram | `POST /api/webhooks/telegram` |
| Email | `POST /api/webhooks/email` |
| Alerts | `POST /api/webhooks/alerts` |
| Generic | `POST /api/webhooks/generic` |

Repeat alerts within 24 hours update the **same** ticket (correlation).

## Lab 10 — Standard flow (full day)

1. `/workflows` → **New flow** → **Standard**.
2. Open the canvas. Identify trigger and assign action.
3. Save. Do **not** point production email/WhatsApp at the classroom.

---

## 10. Reports, Assistant, Insights, WFM

**Dashboard** (`/dashboard`) — KPIs and aging for the active account.

**Reports** (`/reports`) — range 7 / 30 / 90 days or custom. Preview, then export CSV / Excel / PDF. KPIs include **FRT**, **MTTR**, **backlog 7d+**, **OLA/UC breached**, and **CSAT**. The **Vendor / UC queue** table compares Fortinet vs Indosat (open, breach, avg queue, service credit). **Ask assistant** jumps to chat with that snapshot.

**Knowledge** (`/knowledge`) — articles from **Publish to knowledge** on a resolved ticket. Creating a ticket with title `VPN` should hint the seeded article. Problem *Backup gagal semalam* has RCA + a linked incident.

**Assistant** — **Tanya AI** on the top bar (or the floating button) opens Nova Agent. Full page remains `/assistant`. Staff only. Reads the last 7 days of ticket facts. It **does not** change tickets. If it is disconnected, admin must set AI on **Integrations** (Groq free key) and **Test connection**.

**AI Insights** (`/insights`) — four cards: queue pressure, SLA breach risk, workforce load, account health. Role-aware. Uses the same AI provider as Assistant. Narratives are tenant-scoped; do not treat them as a ticket update.

**WFM** (`/wfm`) — occupancy, roster, skills, on-call, forecast, **reviews**. Occupancy and forecast follow the **account** filter (assignment groups on that account). Roster, skills, on-call, and reviews are **tenant-wide**. Dispatch policy lives on the assignment group (`/org`). Auto-assign needs Redis + `npm run worker`. Classroom: **read** occupancy and forecast; set your own presence if asked. Do **not** rewrite the shared roster, skills, on-call slots, or the seeded staff review unless the trainer says the tenant is isolated. Lead/SPV: **Penilaian** → New → scores 1–5 + notes → **Ask AI** (advisory) → Submit. Agent: open the submitted review and **Akui**. Snapshot and AI scores are period metrics, not the official score.

**Import** (`/import`) — manager+. Download a template, fill rows, preview, then import only if the preview has no errors.

Never paste API keys into chat or slides.

---

## 11. Governance (UU PDP)

`/governance`

| Area | SLA to remember |
| --- | --- |
| RoPA | Record of processing activities |
| DSAR | Data subject request — **30 days** |
| Breach | Notify clock **72 hours** from discovery |
| Privacy notice | Off on the portal until admin **Enable on portal** |

Customer: `/portal/privacy` only when enabled. Public `/privacy` follows the same switch.

Password rotation: portal and desk passwords expire every **30 days**. Expired users can only change the password. Admin resets at `/users/[id]`. Policy: Settings → Security.

## Lab 11 — Governance (full day)

1. Open **Governance**.
2. Open DSAR queue — note due dates.
3. As admin, optionally **Enable on portal**, then as customer open **Privacy** (do not file a real DSAR against production data).

## Lab 11b — Insights and WFM (full day)

1. Sidebar → **AI Insights**. Run one card if AI is connected (trainer confirms).
2. Sidebar → **WFM**. Open occupancy, then forecast. Presence (own) is OK. Do not edit the shared roster, skills, or on-call. Open **Reviews** and read the seeded Sari review; do not rewrite it.

---

## 12. Admin: Integrations

`/settings` — admin only.

The page renders a **plugin catalog** (global + tenant-custom). Built-in kinds include AI, WhatsApp, Telegram, email, Gmail, Exchange, Slack, Teams, Jira, Salesforce, Entra / Google / Okta / SAML SSO, and webhook. **Tambah plugin** adds a tenant card immediately.

For each card: paste configuration → **Save** → **Test connection**. Badge: `connected` / `failed` / `saved`. Google / Microsoft / Okta also drive the login buttons on `/login` (enable the provider in Supabase Auth). SAML: paste SSO URL + IdP cert, then **Continue with SAML** on `/login`. ACS `/api/auth/saml/acs`. App MFA stays off in the lab.

AI classroom default: **Groq (free)**, model `llama-3.1-8b-instant`. Key prefix `gsk_`. Endpoint must stay `https://api.groq.com/openai/v1` — do not use `gpt-4o-mini` on Groq.

Email on the laptop lands in **Mailpit**, not Gmail.

## Lab 12 — Integrations walkthrough (full day, admin)

1. Open `/settings`.
2. Show each card. Run **Test connection** only on Email (Mailpit) unless keys are provisioned.
3. Open Appearance and confirm it is available to agents too.

---

## 13. Keyboard and daily habits

| Shortcut | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘N` / `Ctrl+N` | New ticket |

Daily agent loop:

1. Switch to the customer **account**.
2. **Mine** + **Unassigned** + **SLA risk**.
3. Work the record (comment, CI, hold/escalate).
4. Board or list — do not keep tickets in `open` without an owner.

---

## 14. Troubleshooting (user)

| You see | Try |
| --- | --- |
| Cannot reach the site | Confirm port **3000** (dev) vs **3001** (Docker) |
| Empty CMDB / missing AST-1001 | Account switcher → **Bank Nusantara** |
| No email | Mailpit http://127.0.0.1:54324 |
| Assistant / Insights error | Admin: Integrations → AI → Test connection |
| Page in the wrong language | Top bar `EN` / `ID` |
| “Unauthorized” on Integrations | You are an agent — use Appearance only |

If Redis is down, realtime and workflows fail. Ask the trainer to open `/api/health`.

---

## 15. Glossary

| Term | Definition |
| --- | --- |
| Account | Customer scope inside the tenant (Internal, Bank, Garuda, or All) |
| CI | Configuration item in CMDB |
| Insights | AI cards on `/insights` — signals only, no ticket writes |
| WFM | Workforce: roster, skills, on-call, occupancy, staff reviews |
| Ops | Sysadmin console on `:3100` — not a staff login |
| CAB | Change Advisory Board |
| DSAR | Data subject access request (UU PDP) |
| Hold | Status that **pauses** SLA |
| Escalate | Move to L2/L3 group; SLA **continues** |
| Tenant | Isolation key `tenant_id` — you do not switch this in the UI |

---

## Document control

| Field | Value |
| --- | --- |
| Title | NovaCRM Participant Manual |
| Audience | Admin, agent, customer trainees |
| Related | Trainer guide, LOCAL.md |
| Classification | Internal training — demo passwords are for the lab tenant only |
