#!/bin/sh
set -eu

sleep 6
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb -p "local/${MINIO_BUCKET:-novacrm}" || true

# Browser uploads from the app origin; allow APP_HOST (+ www if used).
APP_ORIGIN="https://${APP_HOST:-localhost}"
cat > /tmp/cors.json <<EOF
{"CORSRules":[{"AllowedOrigins":["${APP_ORIGIN}","http://localhost:3000","http://127.0.0.1:3000"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Location","Content-Length"]}]}
EOF

mc cors set "local/${MINIO_BUCKET:-novacrm}" /tmp/cors.json || true
mc anonymous set none "local/${MINIO_BUCKET:-novacrm}" || true
exit 0
