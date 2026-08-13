#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  echo "Use the Supabase connection string (Session mode / URI) and include sslmode=require."
  exit 1
fi

case "$DATABASE_URL" in
  *sslmode=*) ;;
  *)
    if echo "$DATABASE_URL" | grep -q '?'; then
      DATABASE_URL="${DATABASE_URL}&sslmode=require"
    else
      DATABASE_URL="${DATABASE_URL}?sslmode=require"
    fi
    ;;
esac
export DATABASE_URL

run_sql_file() {
  file="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "psql or Docker is required to run migrations."
    exit 1
  fi

  docker run --rm \
    -e DATABASE_URL \
    -v "$MIGRATIONS_DIR:/migrations:ro" \
    postgres:16-alpine \
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "/migrations/$(basename "$file")"
}

echo "Running NovaCRM migrations from $MIGRATIONS_DIR"
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  echo "-> $(basename "$file")"
  run_sql_file "$file"
done

echo "Migrations complete."
