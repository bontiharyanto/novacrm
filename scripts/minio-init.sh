#!/bin/sh
set -eu

sleep 6
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb -p "local/${MINIO_BUCKET:-novacrm}" || true

cat > /tmp/cors.json <<EOF
{"CORSRules":[{"AllowedOrigins":["https://${APP_HOST:-localhost}"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Location"]}]}
EOF

mc cors set "local/${MINIO_BUCKET:-novacrm}" /tmp/cors.json || true
exit 0
