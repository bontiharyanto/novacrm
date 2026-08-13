#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> NovaCRM local production deploy"
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

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:3000 -sTCP:LISTEN || true)"
  if [ -n "$PIDS" ]; then
    for pid in $PIDS; do
      comm="$(ps -p "$pid" -o comm= 2>/dev/null || true)"
      case "$comm" in
        node|node-*|next|next-*)
          echo "==> Stopping $comm on :3000 (pid $pid)"
          kill "$pid" 2>/dev/null || true
          ;;
        *)
          echo "==> Leaving pid $pid ($comm) on :3000 for Docker to replace"
          ;;
      esac
    done
    sleep 1
  fi
fi

echo "==> Building production image and starting app + worker"
docker compose -f docker-compose.local.yml --env-file .env.local up --build -d

echo "==> Waiting for /api/health"
i=0
while [ "$i" -lt 45 ]; do
  HEALTH="$(curl -sS "http://127.0.0.1:3000/api/health" 2>/dev/null || true)"
  case "$HEALTH" in
    *'"status":"ok"'*)
      echo
      echo "$HEALTH"
      echo
      echo
      echo "Local production is up: http://localhost:3000"
      echo "Login: admin@novacrm.app / NovaCRM!2026"
      echo "Stop with: npm run local:undeploy"
      exit 0
      ;;
  esac
  i=$((i + 1))
  sleep 2
done

echo "Health check timed out. Last app logs:"
docker compose -f docker-compose.local.yml logs --tail=80 app
exit 1
