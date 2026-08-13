#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  echo ".env.local is missing. Run: npm run local:setup"
  exit 1
fi

docker compose up -d redis minio minio-init

cleanup() {
  kill "$WORKER_PID" "$DEV_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

npm run worker &
WORKER_PID=$!

npm run dev &
DEV_PID=$!

echo
echo "NovaCRM local is starting:"
echo "  App     http://localhost:3000"
echo "  MinIO   http://localhost:9001  (minioadmin / minioadmin)"
echo "  Studio  http://127.0.0.1:54323  (if supabase start is running)"
echo
echo "Login: admin@novacrm.app / NovaCRM!2026"
echo "Ctrl+C stops both Next.js and the worker."
echo

wait "$DEV_PID"
