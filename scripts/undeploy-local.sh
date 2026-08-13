#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Stopping local production containers"
docker compose -f docker-compose.local.yml down

echo "App/worker stopped. Supabase is still running."
echo "Docker was on http://localhost:${APP_PORT:-3001}"
echo "Hot reload: npm run local:dev   → http://localhost:3000"
echo "Stop everything: npm run local:stop"
