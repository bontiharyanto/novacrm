#!/bin/sh
set -eu

sleep 6
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb -p "local/${MINIO_BUCKET:-novacrm}" || true

# Community MinIO does not support per-bucket CORS (mc cors set → AIStor only).
# Browser PUT/GET CORS is controlled by MINIO_API_CORS_ALLOW_ORIGIN on the minio service
# (default '*'). Optionally tighten via mc admin when the server accepts it:
APP_ORIGIN="https://${APP_HOST:-localhost}"
ORIGINS="${APP_ORIGIN},http://localhost:3000,http://127.0.0.1:3000"
if mc admin config set local api cors_allow_origin="${ORIGINS}" 2>/tmp/mc-cors.err; then
  echo "Global API CORS set to: ${ORIGINS}"
  echo "Restart the minio container once if uploads still fail CORS preflight."
else
  echo "Skipping mc admin CORS (ok on community MinIO). Rely on MINIO_API_CORS_ALLOW_ORIGIN."
  cat /tmp/mc-cors.err >/dev/null 2>&1 || true
fi

mc anonymous set none "local/${MINIO_BUCKET:-novacrm}" || true
echo "MinIO bucket local/${MINIO_BUCKET:-novacrm} is ready (private)."
exit 0
