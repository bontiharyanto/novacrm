# NovaCRM

NovaCRM is a support operations platform for managing customer service workflows, notifications, and ticket resolution in a single modern workspace. It is designed for teams that need to respond quickly to customer issues, coordinate internal follow-up, and keep communication channels aligned across email, WhatsApp, and Telegram.

## Product Summary

NovaCRM helps support teams move from fragmented communication to a structured service workflow. Instead of chasing issues across channels, teams can track work, prioritize urgency, and monitor service health from one dashboard.

### The problem NovaCRM solves
- customer issues arrive from multiple channels
- cases are difficult to triage without a shared workflow
- support teams lose context between channels and tools
- SLA deadlines and escalation risk are not clearly visible

### The solution
- central ticket dashboard for case intake and triage
- Kanban-based lifecycle tracking for support queues
- notification dispatch across preferred communication channels
- due-date and SLA monitoring to reduce missed response windows
- webhook-driven intake from messaging platforms
- tenant-aware configuration for multi-client or multi-brand operations

---

## Investor / Demo Narrative

NovaCRM is positioned as a practical workflow platform for modern support operations. It combines a strong operational UX with a modular architecture that can scale from a local prototype into a real customer support system.

The product story is simple:

1. customer issues arrive from multiple entry points
2. the platform creates a structured support ticket
3. support agents triage and route work into the proper lifecycle state
4. notification channels keep both teams and customers informed
5. SLA monitoring and status visibility reduce operational risk

This makes NovaCRM suitable for SMB service teams, SaaS support desks, field service operations, and multi-tenant customer care environments.

---

## SaaS Product Positioning

### Core capabilities
- Ticket creation and lifecycle management
- Kanban operations board
- SLA risk monitoring and due-date tracking
- WhatsApp, Telegram, and email notification channels
- admin configuration panel for notification settings
- webhook-based automation for inbound communication
- structured logging for operational visibility

### Why it stands out
- designed for operational speed and clarity
- supports multi-channel service intake
- based on a clean Next.js architecture
- ready for extension with real database and queue infrastructure
- suitable for both internal support teams and customer-facing service operations

---

## Internal Engineering Overview

### Architecture
NovaCRM follows a modular application structure built with Next.js and TypeScript. The foundation is separated into a few clear domains:

- app layer: route handlers and page-level UI
- components: dashboard, ticket UI, and admin panels
- lib: domain rules, configuration, integrations, and ticket logic
- supabase: schema and migration structure for database readiness
- notifications: templates, logging, queue abstractions, and dispatch logic

### Key application domains
- Tickets: creation, updates, lifecycle changes, assignment, comments
- Notifications: channel configuration, templates, logs, message dispatch
- Webhooks: WhatsApp and Telegram inbound message ingestion
- Tenants: multi-tenant structure and config management
- Integrations: email, Telegram, and WhatsApp APIs with safe fallbacks

### Operational assumptions
- fallback in-memory storage is available for local prototyping
- real persistence can be plugged into Supabase or another database layer
- queue abstraction is ready for future Redis/BullMQ implementation
- external providers can be enabled through environment variables

---

## Features

### Ticket management
- create tickets from the operations dashboard
- manage status states: open, in progress, waiting, on hold, resolved, and closed
- filter and review queue activity using a kanban-style board
- review ticket detail pages with comments and SLA information

### Notification management
- configure channels for email, WhatsApp, and Telegram
- dispatch lifecycle messages for updates and events
- keep a log of notification activity for troubleshooting and auditing

### Webhook automation
- collect inbound WhatsApp payloads and convert them to tickets
- collect inbound Telegram payloads and convert them to tickets
- create a structure for future CRM integrations and external communication systems

### Admin experience
- notification settings page
- configuration management for tenant-specific behavior
- support for channel testing and a clean operational admin UI

---

## Technology Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase-ready schema and migration support
- Docker support for local orchestration
- Redis/BullMQ-ready architecture for production queueing

---

## Project Structure

```text
novacrm/
├── app/
│   ├── api/
│   ├── (admin)/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── settings/
│   ├── tickets/
│   └── ui/
├── lib/
│   ├── config/
│   ├── integrations/
│   ├── notifications/
│   ├── settings/
│   ├── supabase/
│   ├── tenants/
│   └── tickets/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
│   └── DEPLOYMENT.md
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- Docker (optional for local services such as Redis and MinIO)

### Install and run locally

1. Clone the repository:

```bash
git clone https://github.com/bontiharyanto/novacrm.git
cd novacrm
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
cp .env.example .env.local
```

4. Start the development server:

```bash
npm run dev
```

5. Open the app in the browser:

```text
http://localhost:3000
```

---

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## Environment Variables

A sample environment file is provided in `.env.example`.

Example variables include:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
WHATSAPP_API_KEY=
TELEGRAM_BOT_TOKEN=
RESEND_API_KEY=
EMAIL_FROM=NovaCRM <no-reply@novacrm.app>
```

These values are used for integration readiness and should be configured in a real deployment environment.

---

## Deployment

Production deployment guidance is available in the deployment documentation:

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

The repository includes Docker-based and environment-driven deployment patterns suitable for local and cloud deployment workflows.

### Recommended deployment options
- Vercel for the Next.js frontend and API routes
- Docker for self-hosted or container-based production deployment
- Supabase for persistent relational storage
- Redis/BullMQ for queue-based notification processing

---

## Production Readiness Notes

This project is structured as a strong operational prototype and can be extended into production with the following next steps:

- connect to a real Supabase project
- configure authentication and authorization
- integrate real notification providers
- add persistent queue processing with Redis/BullMQ
- implement role-based access controls for support and admin teams
- add reporting and analytics surfaces

---

## Roadmap

### Near-term priorities
- real data persistence and relational modeling
- secure auth and RBAC
- production notification provider setup
- operational analytics and reporting

### Longer-term vision
- multi-tenant support operations platform
- AI-assisted triage and response drafting
- customer communication analytics
- SLA and performance forecasting

---

## License

This project is intended for development, demonstration, and operational prototyping. Before production use, confirm licensing and compliance requirements for your deployment environment and customer use cases.

---

## Contact

For collaboration, product feedback, or operational use cases, please use the GitHub repository and issue tracking for this project.
