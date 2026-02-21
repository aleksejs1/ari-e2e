#!/bin/bash
set -euo pipefail

# Usage:
#   ./scripts/setup.sh                         # Latest main branch
#   ./scripts/setup.sh --branch feature/foo    # Specific branch
#   ./scripts/setup.sh --commit abc1234        # Specific commit
#   ./scripts/setup.sh --pr 42                 # Pull Request (gh CLI)
#   ./scripts/setup.sh --image my-image:tag    # Pre-built image
#   ./scripts/setup.sh --tag v1.2.3            # Specific git tag

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ARI_SOURCE_DIR="${ARI_SOURCE_DIR:-$(dirname "$PROJECT_DIR")/ari}"

BRANCH=""
COMMIT=""
PR=""
IMAGE=""
TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch) BRANCH="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
        --pr)     PR="$2"; shift 2 ;;
        --image)  IMAGE="$2"; shift 2 ;;
        --tag)    TAG="$2"; shift 2 ;;
        *)        echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Checkout specific version if needed
if [[ -n "$TAG" ]]; then
    echo ">> Checking out tag: $TAG"
    (cd "$ARI_SOURCE_DIR" && git fetch origin --tags && git checkout "tags/$TAG")
elif [[ -n "$BRANCH" ]]; then
    echo ">> Checking out branch: $BRANCH"
    (cd "$ARI_SOURCE_DIR" && git fetch origin && git checkout "$BRANCH" && git pull origin "$BRANCH")
elif [[ -n "$COMMIT" ]]; then
    echo ">> Checking out commit: $COMMIT"
    (cd "$ARI_SOURCE_DIR" && git fetch origin && git checkout "$COMMIT")
elif [[ -n "$PR" ]]; then
    echo ">> Checking out PR #$PR"
    (cd "$ARI_SOURCE_DIR" && gh pr checkout "$PR")
fi

# Build or pull image
export ARI_SOURCE_DIR
if [[ -n "$IMAGE" ]]; then
    export ARI_IMAGE="$IMAGE"
fi

echo ">> Starting E2E environment..."
docker compose -f "$PROJECT_DIR/docker/compose.e2e.yaml" up -d --build --wait

echo ">> Waiting for services to be ready..."
"$SCRIPT_DIR/wait-for-ready.sh"

echo ">> Seeding test data..."
"$SCRIPT_DIR/seed.sh"

echo ">> E2E environment is ready!"
echo "   App:     http://localhost:${APP_PORT:-8081}"
echo "   Mailpit: http://localhost:${MAILPIT_PORT:-8026}"
