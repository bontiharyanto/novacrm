#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Install Docker on this VPS first."
  exit 1
fi

sh "$ROOT_DIR/scripts/check-prod-env.sh"

APP_HOST="$(grep '^APP_HOST=' .env.production | head -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==> Pulling GHCR image and starting stack (web x3)"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans --scale web=3

echo "==> Running database migrations"
if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(grep '^DATABASE_URL=' .env.production | head -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  export DATABASE_URL
fi
sh "$ROOT_DIR/scripts/migrate.sh"

echo "==> Waiting for health"
tries=0
until docker compose -f docker-compose.prod.yml exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  tries=$((tries + 1))
  if [ "$tries" -ge 20 ]; then
    echo "Healthcheck failed. Inspect: docker compose -f docker-compose.prod.yml logs web --tail 80"
    exit 1
  fi
  sleep 3
done

echo
echo "NovaCRM is up."
echo "  App     https://${APP_HOST:-<APP_HOST>}"
echo "  Files   https://$(grep '^MINIO_PUBLIC_HOST=' .env.production | cut -d= -f2- | tr -d '"' || true)"
echo "  Health  https://${APP_HOST:-<APP_HOST>}/api/health"
echo
echo "Login: admin@novacrm.app / NovaCRM!2026"
echo "If users are missing, run: sh scripts/provision-hosted.sh"
