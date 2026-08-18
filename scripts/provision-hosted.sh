#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

env_value() {
  key="$1"
  file="$2"
  [ -f "$file" ] || return 0
  grep "^${key}=" "$file" 2>/dev/null | head -n 1 | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//'
}

if [ -f .env.production ]; then
  DATABASE_URL="${DATABASE_URL:-$(env_value DATABASE_URL .env.production)}"
  API_URL="${NEXT_PUBLIC_SUPABASE_URL:-$(env_value NEXT_PUBLIC_SUPABASE_URL .env.production)}"
  API_URL="${API_URL:-$(env_value NOVACRM_SUPABASE_URL .env.production)}"
  SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(env_value SUPABASE_SERVICE_ROLE_KEY .env.production)}"
fi

if [ -f .env.local ]; then
  DATABASE_URL="${DATABASE_URL:-$(env_value DATABASE_URL .env.local)}"
  API_URL="${API_URL:-$(env_value NEXT_PUBLIC_SUPABASE_URL .env.local)}"
  API_URL="${API_URL:-$(env_value NOVACRM_SUPABASE_URL .env.local)}"
  SERVICE_KEY="${SERVICE_KEY:-$(env_value SUPABASE_SERVICE_ROLE_KEY .env.local)}"
fi

if [ -z "${DATABASE_URL:-}" ] || [ -z "${API_URL:-}" ] || [ -z "${SERVICE_KEY:-}" ]; then
  echo "Need DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY."
  echo "Put them in .env.local (laptop) or .env.production (VPS), then re-run."
  exit 1
fi

export DATABASE_URL

echo "==> Applying migrations to hosted Postgres"
sh "$ROOT_DIR/scripts/migrate.sh"

if [ "${SKIP_SEED:-}" != "1" ]; then
  echo "==> Applying seed.sql"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f "$ROOT_DIR/supabase/seed.sql"
  else
    docker run --rm \
      -e DATABASE_URL \
      -v "$ROOT_DIR/supabase:/supabase:ro" \
      postgres:17-alpine \
      psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f /supabase/seed.sql
  fi
fi

echo "==> Ensuring demo Auth users"
sh "$ROOT_DIR/scripts/seed-local-auth.sh" "$API_URL" "$SERVICE_KEY"

echo
echo "Hosted Supabase is ready."
echo "Login: admin@novacrm.app / NovaCRM!2026"
