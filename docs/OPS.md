# Sysadmin Ops

Standalone health and queue console. It does **not** go through Next.js, so it stays up if the desk on `:3000` or `:3001` is down.

## URLs

| Mode | How it starts | Console |
| --- | --- | --- |
| Hot reload | `npm run local:dev` or `npm run ops` | http://127.0.0.1:3100 |
| Docker (laptop) | `npm run local:deploy` (service `ops`) | http://127.0.0.1:3100 |

`local:deploy` frees `:3100` if a host `npm run ops` is already bound, then publishes Docker Ops on `127.0.0.1:3100`. `local:dev` skips starting a second Ops process when that port is taken.

Do not expose `:3100` on a public interface without `OPS_TOKEN`.

## What it shows

- Service probes: app `:3000`, Docker app `:3001`, Redis, Postgres, Supabase API, Studio, MinIO, Mailpit, Ops itself
- BullMQ counts for `novacrm-notifications`, `novacrm-workflows`, `novacrm-wfm`
- Failed jobs + **Retry** / **Retry failed**
- Shortcuts to Studio, MinIO console, Mailpit

Retry only re-queues the job. It does not rewrite ticket rows.

Scale workers (add a second BullMQ process): [WORKERS.md](WORKERS.md). Default is **1** container. Do not confuse with `--scale web=3`.

## HTTP

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/health` | Open |
| `GET` | `/` | Required |
| `GET` | `/api/status` | Required |
| `POST` | `/api/queues/{notifications\|workflows\|wfm}/jobs/{id}/retry` | Required |
| `POST` | `/api/queues/{notifications\|workflows\|wfm}/failed/retry` | Required |

Auth when `OPS_TOKEN` is set: header `x-ops-token`, `Authorization: Bearer`, or cookie `ops_token`.

Without a token:

- Host bind `127.0.0.1` — loopback clients only
- Docker local compose sets `OPS_ALLOW_UNAUTHENTICATED=true` because the publish is already `127.0.0.1:3100`

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPS_PORT` | `3100` | Listen port |
| `OPS_BIND` | `127.0.0.1` | Bind address (`0.0.0.0` inside the Ops container) |
| `OPS_TOKEN` | empty | Shared secret |
| `OPS_PROBE_HOST` | empty | Rewrite `127.0.0.1` in probes (Docker uses `host.docker.internal`) |
| `OPS_ALLOW_UNAUTHENTICATED` | unset | Local Docker only |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Queue + Redis ping |
| `APP_URL` / `DOCKER_APP_URL` | `:3000` / `:3001` | Browser links + health |

See `.env.example`. Production compose (`docker-compose.prod.yml`) does **not** publish Ops; keep it on the laptop or bind it to loopback on the VPS if you add the service later.
