#!/bin/bash
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:${APP_PORT:-8081}}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/compose.e2e.yaml}"

echo ">> Running E2E seed command..."
docker compose -f "$COMPOSE_FILE" exec -T app \
    php /app/core/bin/console ari:e2e:seed --no-interaction

echo ">> Verifying seed data..."
RESPONSE=$(curl -sf "$APP_URL/api/login_check" \
    -H "Content-Type: application/json" \
    -d '{"username": "e2e-user", "password": "e2e-password"}')

if echo "$RESPONSE" | grep -q "token"; then
    echo ">> Seed verified: e2e-user can authenticate"
else
    echo ">> ERROR: Seed verification failed"
    exit 1
fi
