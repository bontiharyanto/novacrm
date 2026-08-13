#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> NovaCRM local setup"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop, then re-run: npm run local:setup"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running. Start Docker Desktop, then re-run: npm run local:setup"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for local auth seed."
  exit 1
fi

env_value() {
  key="$1"
  file="$2"
  grep "^${key}=" "$file" | head -n 1 | cut -d= -f2- | tr -d '"'
}

write_env() {
  supabase_url="$1"
  anon_key="$2"
  service_key="$3"

  cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key
NOVACRM_SUPABASE_URL=$supabase_url
NOVACRM_SUPABASE_ANON_KEY=$anon_key
SUPABASE_SERVICE_ROLE_KEY=$service_key

WHATSAPP_API_KEY=
WHATSAPP_WEBHOOK_SECRET=local-whatsapp-secret
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=local-telegram-secret
RESEND_API_KEY=
EMAIL_FROM="NovaCRM <no-reply@novacrm.app>"
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
MAILPIT_URL=http://127.0.0.1:54324
WEBHOOK_TENANT_ID=11111111-1111-1111-1111-111111111111
REDIS_URL=redis://127.0.0.1:6379
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=novacrm
EOF
}

if [ ! -d node_modules ]; then
  echo "==> npm install"
  npm install
else
  echo "==> npm install skipped (node_modules exists)"
fi

echo "==> Redis + MinIO"
docker compose up -d redis minio minio-init

echo "==> Local Supabase (Postgres + Auth + Realtime)"
echo "    First run downloads Docker images and can take several minutes."

if npx --yes supabase start; then
  STATUS_FILE="$(mktemp)"
  npx --yes supabase status -o env > "$STATUS_FILE"

  API_URL="$(env_value API_URL "$STATUS_FILE")"
  ANON_KEY="$(env_value ANON_KEY "$STATUS_FILE")"
  SERVICE_KEY="$(env_value SERVICE_ROLE_KEY "$STATUS_FILE")"
  rm -f "$STATUS_FILE"

  if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
    echo "Could not read supabase status. Copy keys from 'npx supabase status' into .env.local"
    cp -n .env.example .env.local || true
    exit 1
  fi

  write_env "$API_URL" "$ANON_KEY" "$SERVICE_KEY"
  echo "==> Applying migrations + seed"
  npx --yes supabase db reset --yes
  echo "==> Ensuring demo logins"
  sh "$ROOT_DIR/scripts/seed-local-auth.sh" "$API_URL" "$SERVICE_KEY"
else
  echo "Supabase local stack could not start."
  echo "You can still test with a hosted Supabase project:"
  echo "  1. cp .env.example .env.local"
  echo "  2. paste NEXT_PUBLIC_SUPABASE_URL, ANON KEY, SERVICE_ROLE_KEY"
  echo "  3. run SQL in supabase/migrations then supabase/seed.sql"
  cp -n .env.example .env.local || true
  exit 1
fi

echo
echo "Setup complete. Next:"
echo "  npm run local:dev"
echo
echo "Then open http://localhost:3000"
echo "Login: admin@novacrm.app / NovaCRM!2026"
echo "Also:  agent@novacrm.app  and  customer@novacrm.app"
echo
echo "Checklist: docs/LOCAL.md"
