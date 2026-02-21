#!/bin/bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker/compose.e2e.yaml}"

echo ">> Stopping E2E environment..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

echo ">> E2E environment stopped and cleaned up."
