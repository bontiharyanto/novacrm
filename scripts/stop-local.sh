#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Stopping local Supabase"
npx --yes supabase stop || true

echo "==> Stopping Redis + MinIO"
docker compose stop redis minio || true

echo "Local stack stopped."
