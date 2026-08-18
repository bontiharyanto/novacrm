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

psql_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "psql or Docker is required to run migrations."
    exit 1
  fi
  docker run --rm \
    -e DATABASE_URL \
    -v "$MIGRATIONS_DIR:/migrations:ro" \
    postgres:17-alpine \
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
}

run_sql() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$1"
    return
  fi
  psql_docker -c "$1"
}

run_sql_query() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "$1"
    return
  fi
  psql_docker -tAc "$1"
}

run_sql_file() {
  file="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    return
  fi
  psql_docker -f "/migrations/$(basename "$file")"
}

echo "Ensuring public.schema_migrations"
run_sql "create table if not exists public.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);"

if [ "${MIGRATE_STAMP:-}" = "1" ]; then
  echo "Stamping existing files as applied (no SQL executed)."
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$file" ] || continue
    id="$(basename "$file")"
    run_sql "insert into public.schema_migrations (id) values ('$id') on conflict (id) do nothing;"
    echo "  stamped $id"
  done
  echo "Stamp complete."
  exit 0
fi

echo "Running NovaCRM migrations from $MIGRATIONS_DIR"
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  id="$(basename "$file")"
  already="$(run_sql_query "select 1 from public.schema_migrations where id = '$id'" | tr -d '[:space:]')"
  if [ "$already" = "1" ]; then
    echo "  skip $id"
    continue
  fi
  echo "-> $id"
  run_sql_file "$file"
  run_sql "insert into public.schema_migrations (id) values ('$id') on conflict (id) do nothing;"
done

echo "Migrations complete."
