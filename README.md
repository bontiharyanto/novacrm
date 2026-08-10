# NovaCRM

NovaCRM is a modern support operations platform designed for managing customer tickets, communicating across channels, and tracking operational workflow health. The application provides a dashboard for support teams to create, triage, and resolve tickets while supporting notification delivery through email, WhatsApp, and Telegram integrations.

## Overview

This project was designed as a lightweight but production-aware customer support system with:

- ticket management and status lifecycle tracking
- kanban-style workflow views
- SLA-aware due dates and risk indicators
- notification configuration for multiple channels
- webhook-based ticket creation from external messaging channels
- tenant-aware configuration structure
- route-based API endpoints for tickets, settings, and notifications

The app is built with Next.js 14, TypeScript, and Tailwind CSS, making it suitable for rapid local development and easy extension into a full production support platform.

## Core Features

### Ticket Management
- Create and view support tickets from the dashboard
- Track lifecycle states such as open, in progress, waiting, on hold, resolved, and closed
- Prioritize tickets by urgency
- Receive due-date and SLA information for operational follow-up

### Notification System
- Configure notification channels per tenant
- Dispatch notifications through email, WhatsApp, or Telegram
- Persist notification logs for auditing and troubleshooting
- Use templates for ticket lifecycle events, including creation and updates

### Webhook Intake
- Accept inbound WhatsApp messages and create support tickets automatically
- Accept inbound Telegram messages and convert them into support records
- Provide a clean API surface for future integrations

### Admin Settings
- Notification settings page for channel configuration
- Support for testing configured channels
- Centralized configuration layer for tenant-specific settings

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase-ready schema and migration structure
- Docker support for local environment setup
- Redis/BullMQ-ready notification queue abstraction

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
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Prerequisites

Before running the project locally, ensure you have:

- Node.js 20 or newer
- npm or pnpm
- Docker (optional, for local services such as Redis and MinIO)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/bontiharyanto/novacrm.git
cd novacrm
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment example if needed:

```bash
cp .env.example .env.local
```

4. Start the application:

```bash
npm run dev
```

5. Open the app in a browser:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Production Validation

This project includes build validation and is intended to be production-aware. A production build can be checked with:

```bash
npm run build
```

## Environment Notes

The project is structured to support real-world operational configuration, including:

- tenant-level settings
- external API integrations
- notification logs and auditing
- Supabase migration support
- queue-based processing patterns for notifications

Some integrations are implemented with safe fallbacks and will operate gracefully when external credentials are not configured.

## Future Roadmap

Potential next steps include:

- real Supabase database integration
- authentication and role-based access control
- production Redis/BullMQ queue processing
- real API credentials for WhatsApp, Telegram, and email providers
- reporting dashboards and analytics

## License

This project is provided for educational and operational demonstration purposes. Please review and adjust licensing requirements before using it in a production environment.

## Contact

For questions or collaboration opportunities, please use the repository contact information and project issues available on GitHub.
