#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Stopping local production containers (if any)"
docker compose -f docker-compose.local.yml down >/dev/null 2>&1 || true

echo "==> Stopping local Supabase"
npx --yes supabase stop || true

echo "==> Stopping Redis + MinIO"
docker compose stop redis minio || true

echo "Local stack stopped."
