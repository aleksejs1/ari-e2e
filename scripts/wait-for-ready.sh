#!/bin/bash
set -euo pipefail

MAX_RETRIES=60
RETRY_INTERVAL=2
APP_URL="${APP_URL:-http://localhost:${APP_PORT:-8081}}"

echo ">> Waiting for app to be healthy..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$APP_URL/api" > /dev/null 2>&1; then
        echo ">> App is ready! (attempt $i)"
        exit 0
    fi
    echo "   Attempt $i/$MAX_RETRIES..."
    sleep $RETRY_INTERVAL
done

echo ">> ERROR: App failed to start after $MAX_RETRIES attempts"
docker compose -f docker/compose.e2e.yaml logs app
exit 1
