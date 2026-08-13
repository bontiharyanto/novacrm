# Local laptop test

Use this before any VPS/GitHub deploy. Auth, tickets, Kanban, and uploads all need local Docker services plus a local (or hosted) Supabase.

## One-time setup

```bash
cd novacrm
npm run local:setup
```

This will:

1. `npm install`
2. Start Redis + MinIO
3. Start local Supabase (`npx supabase start`)
4. Apply migrations + seed
5. Write `.env.local`

First `supabase start` downloads several Docker images and can take several minutes.

## Run the app

```bash
npm run local:dev
```

Open [http://localhost:3000](http://localhost:3000)

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@novacrm.app` | `NovaCRM!2026` |
| agent | `agent@novacrm.app` | `NovaCRM!2026` |
| customer | `customer@novacrm.app` | `NovaCRM!2026` |

## What to click through

1. Login as **admin** → tickets dashboard
2. Create a ticket → card appears on Kanban
3. Drag the card to In Progress
4. Open the ticket → add a Tiptap comment
5. Attach a small file (MinIO). Console: [http://localhost:9001](http://localhost:9001)
6. Open Assets and CMDB, create one row each
7. Settings → Notifications (admin only). Leave API keys empty unless you want a real send
8. Sign out, login as **customer** → portal only
9. `http://localhost:3000/api/health` should show Redis `up`

WhatsApp/Telegram/email sends stay skipped until those API keys are set. Ticket create still works.

## Useful URLs

- App: http://localhost:3000
- Supabase Studio: http://127.0.0.1:54323
- MinIO console: http://localhost:9001
- Mailpit (local auth mail): http://127.0.0.1:54324

## Stop

Ctrl+C in the `local:dev` terminal.

```bash
npm run local:stop
```

That stops local Supabase, Redis, and MinIO.

## If setup fails

- Start Docker Desktop, then re-run `npm run local:setup`
- Give Docker at least 6 GB RAM; local Supabase pulls several images on first run
- If Postgres version mismatches, check `npx supabase start` output and set `[db] major_version` in `supabase/config.toml` to the version the CLI expects
- Or use a hosted Supabase project: copy `.env.example` → `.env.local`, paste URL + anon + service role, run the SQL files in `supabase/migrations` then `supabase/seed.sql`, then `npm run local:dev`
