#!/bin/sh
set -eu

API_URL="${1:-}"
SERVICE_KEY="${2:-}"

if [ -z "$API_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "Usage: seed-local-auth.sh <supabase-api-url> <service-role-key>"
  exit 1
fi

TENANT_ID="11111111-1111-1111-1111-111111111111"
PASSWORD="NovaCRM!2026"

upsert_user() {
  id="$1"
  email="$2"
  role="$3"
  name="$4"

  payload=$(printf '{"id":"%s","email":"%s","password":"%s","email_confirm":true,"user_metadata":{"full_name":"%s","role":"%s","tenant_id":"%s"}}' \
    "$id" "$email" "$PASSWORD" "$name" "$role" "$TENANT_ID")

  code=$(curl -sS -o /tmp/novacrm-auth-user.json -w "%{http_code}" \
    -X POST "$API_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" || true)

  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  created $email"
    return 0
  fi

  curl -sS -o /tmp/novacrm-auth-user.json \
    -X PUT "$API_URL/auth/v1/admin/users/$id" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "$(printf '{"email":"%s","password":"%s","email_confirm":true}' "$email" "$PASSWORD")" >/dev/null || true

  echo "  ensured $email (http $code)"
}

upsert_profile() {
  id="$1"
  email="$2"
  role="$3"
  name="$4"

  payload=$(printf '{"id":"%s","tenant_id":"%s","role":"%s","full_name":"%s","email":"%s","created_by":"%s"}' \
    "$id" "$TENANT_ID" "$role" "$name" "$email" "$id")

  curl -sS -o /dev/null \
    -X POST "$API_URL/rest/v1/profiles?on_conflict=id" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$payload"
}

echo "==> Demo auth users"

upsert_user "22222222-2222-2222-2222-222222222222" "admin@novacrm.app" "admin" "Nova Admin"
upsert_profile "22222222-2222-2222-2222-222222222222" "admin@novacrm.app" "admin" "Nova Admin"

upsert_user "33333333-3333-3333-3333-333333333333" "agent@novacrm.app" "agent" "Nova Agent"
upsert_profile "33333333-3333-3333-3333-333333333333" "agent@novacrm.app" "agent" "Nova Agent"

upsert_user "44444444-4444-4444-4444-444444444444" "customer@novacrm.app" "customer" "Nova Customer"
upsert_profile "44444444-4444-4444-4444-444444444444" "customer@novacrm.app" "customer" "Nova Customer"
