#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Apply SQL in supabase/migrations via the Supabase SQL editor."
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run migrations."
  exit 1
fi

echo "Running NovaCRM migrations from $MIGRATIONS_DIR"
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  echo "-> $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Migrations complete."
