# Sidebar information architecture audit

Audit and implementation notes for NovaCRM agent shell navigation (`components/layout/admin-shell.tsx`).

## Goals

- Match navigation to how each role works day-to-day (agent → desk first; SPV/manager → WFM + reports).
- Reduce noise (hide irrelevant modules, collapse advanced sections).
- Keep command palette (`⌘K`) aligned with the same IA.

## Section structure (post P1)

| Section | Contents | Default collapse (agent/lead) |
|---------|----------|-------------------------------|
| **Favorites** | User-pinned links | — |
| **Operasi** | Dashboard, Delivery (role-gated), Knowledge, WFM folder | — |
| **Service desk** | My tickets, Incidents…All tickets | — |
| **Inventaris** | Assets, CMDB | — |
| **Analitik** | Reports, AI Insights, Audit | collapsed |
| **Administrasi** | Accounts, Org, Users, SLA, Catalog, Automation, Governance, Import | collapsed |
| **Platform** | Tenants, Capability matrix | collapsed |

Cookie keys: `novacrm_nav_pins`, `novacrm_nav_collapse`, `novacrm_nav_folders`, `novacrm_sidebar_rail`.

Legacy cookie migration (`lib/nav/defaults.ts`): `overview` → `operations`, `configuration` → `inventory` + `administration`.

## Role behaviour

| Role | Delivery nav | WFM sub-links | Default pins |
|------|--------------|---------------|--------------|
| agent, team_lead | hidden | Occupancy, Roster, Swaps, Forecast, Reviews | Incidents + My tickets |
| supervisor | hidden | + Shifts, Skills, On-call | WFM + Reports |
| manager+ | visible | full WFM | WFM + Reports |

Delivery visibility: `lib/nav/delivery-nav.ts` — `pm_delivery`, `dco`, `manager`, `admin`, `superadmin`.

WFM tab visibility: `lib/wfm/nav-config.ts` — shifts/skills/on-call require `create` on `Wfm`.

## Implementation phases

### P0 (done)

- Hide Delivery for non-delivery roles.
- Move Knowledge to Operasi; remove from Platform.
- Flat **Inventaris** section for agent/lead (no nested folder).
- Default nav pins per role (`lib/nav/pins.ts`).
- **My tickets** → `/tickets?queue=mine` at top of Service desk.

### P1 (done)

- Rename/restructure sections (Operasi, Analitik, Administrasi, Platform).
- WFM nested folder in Operasi with role-aware links.
- Shared WFM nav config for sidebar + in-page tabs.
- Default section collapse per role.
- Service desk subtitle hint.

### P2 (done)

- **SLA risk badge** on Incidents nav — rose count from `/api/tickets/queue-counts` field `incidentSlaRisk` (open incidents at SLA risk or breached). Shown alongside open-queue count.
- **Command palette** grouped by sidebar sections via `lib/nav/command-items.ts` (Operasi, Service desk, Inventaris, Analitik, Administrasi, Platform, Settings).
- This document.

## Key files

| File | Purpose |
|------|---------|
| `components/layout/admin-shell.tsx` | Sidebar rendering, badges, collapse |
| `lib/nav/pins.ts` | Default + serialized favorites |
| `lib/nav/defaults.ts` | Section IDs, collapse defaults, cookie migration |
| `lib/nav/command-items.ts` | Command palette groups (mirrors sidebar RBAC) |
| `lib/nav/delivery-nav.ts` | Delivery link visibility |
| `lib/wfm/nav-config.ts` | WFM tabs + sidebar label keys |
| `lib/tickets/queue-counts.ts` | Open queue + SLA risk counts |

## Manual verification

1. Clear nav cookies and reload.
2. **Agent**: no Delivery; Operasi shows WFM folder; Inventaris flat; Analitik/Administrasi/Platform collapsed; Incidents shows rose badge when seed has SLA-risk tickets.
3. **SPV**: full WFM folder; Administrasi visible when expanded.
4. **⌘K**: groups match sidebar section titles; WFM items respect role; no Delivery for agent.

## Future ideas (not implemented)

- URL filter `?sla=risk` on ticket list from Incidents badge click.
- SLA risk badge on All tickets or Problems.
- Command palette: show live queue counts in item labels.
- Capability overrides passed into command palette (today: role defaults only).
