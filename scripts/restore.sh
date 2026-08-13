#!/bin/sh
set -eu

STAMP="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

if [ -z "$STAMP" ]; then
  echo "Usage: ./scripts/restore.sh YYYYMMDD"
  exit 1
fi

DUMP_FILE="$BACKUP_DIR/novacrm-$STAMP.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  exit 1
fi

if [ ! -f "$DUMP_FILE" ] && [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  mc alias set backup "$BACKUP_S3_ENDPOINT" "${BACKUP_S3_ACCESS_KEY}" "${BACKUP_S3_SECRET_KEY}" >/dev/null
  mkdir -p "$BACKUP_DIR"
  mc cp backup/"${BACKUP_S3_BUCKET}"/postgres/novacrm-"$STAMP".sql.gz "$DUMP_FILE"
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump not found: $DUMP_FILE"
  exit 1
fi

echo "Restoring Postgres from $DUMP_FILE"
gunzip -c "$DUMP_FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1

if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  mc alias set backup "$BACKUP_S3_ENDPOINT" "${BACKUP_S3_ACCESS_KEY}" "${BACKUP_S3_SECRET_KEY}" >/dev/null
  mc alias set local "${MINIO_ENDPOINT:-http://minio:9000}" "${MINIO_ACCESS_KEY:-minioadmin}" "${MINIO_SECRET_KEY:-minioadmin}" >/dev/null
  echo "Restoring MinIO objects"
  mc mirror --overwrite backup/"${BACKUP_S3_BUCKET}"/minio/"$STAMP" local/"${MINIO_BUCKET:-novacrm}"
fi

echo "Restore complete: $STAMP"
