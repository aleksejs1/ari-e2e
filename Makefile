COMPOSE_FILE ?= docker/compose.e2e.yaml
SCRIPTS_DIR  := scripts

.PHONY: up down test test-ui test-smoke seed reset cleanup install

install:
	npm install
	npx playwright install chromium --with-deps

up:
	bash $(SCRIPTS_DIR)/setup.sh

down:
	bash $(SCRIPTS_DIR)/teardown.sh

seed:
	bash $(SCRIPTS_DIR)/seed.sh

reset:
	curl -sf -X POST http://localhost:$${APP_PORT:-8081}/api/e2e/reset | jq .

test:
	npx playwright test

test-ui:
	npx playwright test --ui

test-smoke:
	npx playwright test --grep @smoke

test-headed:
	npx playwright test --headed

report:
	npx playwright show-report

cleanup:
	curl -sf -X POST http://localhost:$${APP_PORT:-8081}/api/e2e/cleanup-orphaned-users | jq .
