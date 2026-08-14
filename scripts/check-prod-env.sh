#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.production ]; then
  echo "Missing .env.production. Copy .env.production.example and fill hosted Supabase + MinIO secrets."
  exit 1
fi

missing=""
for key in APP_HOST MINIO_PUBLIC_HOST NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NOVACRM_SUPABASE_URL NOVACRM_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DATABASE_URL MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  value="$(grep "^${key}=" .env.production | head -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  case "$value" in
    ''|*your-project*|*your-anon-key*|*change-me*|*postgres:postgres@*|*crm.example.com*|*files.crm.example.com*)
      missing="$missing $key"
      ;;
  esac
done

if [ -n "$missing" ]; then
  echo "Production env still has placeholders:$missing"
  exit 1
fi

if [ ! -f .env ]; then
  echo "==> Writing Compose interpolation .env from .env.production"
  grep -E '^(APP_HOST|ACME_EMAIL|IMAGE_TAG|MINIO_PUBLIC_HOST|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD|MINIO_BUCKET|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)=' .env.production > .env || true
fi

echo "Production env looks complete."
