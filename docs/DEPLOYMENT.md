# Deployment Guide

This document outlines a practical production deployment setup for NovaCRM and explains the recommended runtime model for a real support operations system.

## Deployment Overview

NovaCRM is built as a Next.js application with server-side API routes. The recommended production setup is:

- Frontend and API: Vercel or a containerized Node runtime
- Database: Supabase Postgres
- Queue: Redis + BullMQ for background notification processing
- Messaging providers: WhatsApp, Telegram, and email services via API keys
- Hosting: Docker-compatible environment for self-hosted or cloud deployments

## Recommended Production Stack

### 1. Application hosting
Use Vercel for a straightforward deployment of the Next.js app because it supports serverless API routes and simple environment variable management.

### 2. Data persistence
Use Supabase for managed Postgres and migration-based schema management.

### 3. Queue and background jobs
For production-grade notification delivery, use Redis with BullMQ.

### 4. External integrations
Configure secrets for:

- WhatsApp API token or provider credentials
- Telegram bot token
- Resend or other email provider API key
- Supabase project URL and anon/service keys

## Environment Variables

Set the following variables in your production environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WHATSAPP_API_KEY=
TELEGRAM_BOT_TOKEN=
RESEND_API_KEY=
EMAIL_FROM=NovaCRM <no-reply@novacrm.app>
NODE_ENV=production
```

## Vercel Deployment

### Step 1: connect the repository
1. Go to Vercel
2. Import the GitHub repository
3. Select the repository root

### Step 2: configure project settings
Set the framework to Next.js. Vercel will detect the configuration automatically.

### Step 3: define environment variables
Add all required keys from the .env.example file into the Vercel project settings.

### Step 4: deploy
Push changes to the main branch and Vercel will handle the deployment automatically.

## Docker Deployment

A Dockerfile is included for container-based deployment. You can build and run the app locally or in a remote VM or container platform.

### Build image

```bash
docker build -t novacrm .
```

### Run container

```bash
docker run -p 3000:3000 --env-file .env.local novacrm
```

## Docker Compose Setup

This project also includes a docker-compose.yml file for running local services such as Redis and supporting infrastructure.

```bash
docker compose up --build
```

## Production Database Setup

1. Create a Supabase project
2. Run the SQL migrations from the supabase/migrations directory
3. Seed base data if needed
4. Configure database access and connection variables

## Notification Processing in Production

The application includes a notification queue abstraction and processing structure. For production usage:

- run Redis as a separate service
- configure BullMQ workers for notification jobs
- ensure job retries and failure logging are enabled
- use service-level monitoring for failed notifications

## Monitoring and Security

Recommended operational controls:

- use HTTPS only in production
- store secrets in environment variables or secret managers
- protect admin routes behind auth and authorization
- log key customer support actions and notification deliveries
- monitor uptime, failed jobs, and webhooks

## Recommended Next Production Milestones

1. connect to Supabase production database
2. enable authentication and RBAC
3. configure real email/WhatsApp/Telegram credentials
4. deploy queue workers for asynchronous notification delivery
5. add monitoring and log retention policies
6. review security and customer support compliance requirements

## Summary

NovaCRM is structured for a clean transition from prototype to production-ready support platform. The current architecture supports a staged rollout: local prototype, deployed app, managed database, and eventually full operational automation with real external services.
