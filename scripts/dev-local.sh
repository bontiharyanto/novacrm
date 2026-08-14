#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  echo ".env.local is missing. Run: npm run local:setup"
  exit 1
fi

docker compose up -d redis minio minio-init

WORKER_PID=
OPS_PID=
DEV_PID=

cleanup() {
  kill $WORKER_PID $OPS_PID $DEV_PID 2>/dev/null || true
}

trap cleanup INT TERM EXIT

npm run worker &
WORKER_PID=$!

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:3100 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Ops already listening on 3100 — not starting a second process."
else
  npm run ops &
  OPS_PID=$!
fi

npm run dev &
DEV_PID=$!

echo
echo "NovaCRM local is starting:"
echo "  App     http://localhost:3000"
echo "  Ops     http://127.0.0.1:3100  (sysadmin)"
echo "  MinIO   http://localhost:9001  (minioadmin / minioadmin)"
echo "  Studio  http://127.0.0.1:54323  (if supabase start is running)"
echo
echo "Login: admin@novacrm.app / NovaCRM!2026"
echo "Ctrl+C stops Next.js, the worker, and Ops."
echo

wait "$DEV_PID"
