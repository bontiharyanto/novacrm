#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

APP_PORT="${APP_PORT:-3001}"
export APP_PORT

echo "==> NovaCRM local production deploy"
echo "    Host port ${APP_PORT} (hot reload stays on 3000)"
echo

if [ ! -f .env.local ]; then
  echo ".env.local is missing. Run: npm run local:setup"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Start Docker Desktop, then re-run: npm run local:deploy"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:54321/auth/v1/health" >/dev/null 2>&1; then
  echo "==> Starting local Supabase"
  npx --yes supabase start
fi

echo "==> Building production image and starting app + worker"
docker compose -f docker-compose.local.yml --env-file .env.local up --build -d

echo "==> Waiting for /api/health on :${APP_PORT}"
i=0
while [ "$i" -lt 45 ]; do
  HEALTH="$(curl -sS "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || true)"
  case "$HEALTH" in
    *'"status":"ok"'*)
      echo
      echo "$HEALTH"
      echo
      echo
      echo "Local production is up: http://localhost:${APP_PORT}"
      echo "Hot reload (if running): http://localhost:3000"
      echo "Login: admin@novacrm.app / NovaCRM!2026"
      echo "Stop Docker app with: npm run local:undeploy"
      exit 0
      ;;
  esac
  i=$((i + 1))
  sleep 2
done

echo "Health check timed out. Last app logs:"
docker compose -f docker-compose.local.yml logs --tail=80 app
exit 1
