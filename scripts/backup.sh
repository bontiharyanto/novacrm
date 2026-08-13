#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"

if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
  DUMP_FILE="$BACKUP_DIR/novacrm-$STAMP.sql.gz"
  echo "Dumping Postgres to $DUMP_FILE"
  pg_dump "$DATABASE_URL" | gzip > "$DUMP_FILE"
fi

if [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if ! command -v mc >/dev/null 2>&1; then
    echo "mc (MinIO client) is required for object backup."
    exit 1
  fi

  mc alias set backup "$BACKUP_S3_ENDPOINT" "${BACKUP_S3_ACCESS_KEY}" "${BACKUP_S3_SECRET_KEY}" >/dev/null
  mc alias set local "${MINIO_ENDPOINT:-http://minio:9000}" "${MINIO_ACCESS_KEY:-minioadmin}" "${MINIO_SECRET_KEY:-minioadmin}" >/dev/null
  echo "Mirroring MinIO bucket to backup target"
  mc mirror --overwrite local/"${MINIO_BUCKET:-novacrm}" backup/"$BACKUP_S3_BUCKET"/minio/"$STAMP"
  mc cp "$BACKUP_DIR"/novacrm-"$STAMP".sql.gz backup/"$BACKUP_S3_BUCKET"/postgres/ 2>/dev/null || true
fi

find "$BACKUP_DIR" -type f -name 'novacrm-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "Backup finished: $STAMP"
