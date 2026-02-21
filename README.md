# Ari E2E Tests

End-to-end test suite for the Ari CRM application, built with [Playwright](https://playwright.dev/).

## Architecture

The E2E environment is a self-contained Docker setup that mirrors production:

```
┌─────────────────────────────────────────────────────────┐
│  Host machine                                           │
│                                                         │
│  ┌─────────────┐    ┌──────────────────────────────┐    │
│  │ Playwright  │───▶│  app (Ari)       :8081       │    │
│  │ Test Runner │    │  APP_ENV=e2e                 │    │
│  └─────────────┘    │  E2E_MODE=1                  │    │
│        │            └──────┬───────────────────────┘    │
│        │                   │                            │
│        │            ┌──────▼──────┐                     │
│        │            │  database   │  MariaDB (tmpfs)    │
│        │            └─────────────┘  or SQLite          │
│        │                                                │
│        ├───────────▶┌─────────────┐                     │
│        │            │  mailpit    │  :8026              │
│        │            └─────────────┘                     │
│        │                                                │
│        ├───────────▶┌─────────────┐                     │
│        │            │ mock-google │  :4020              │
│        │            └─────────────┘                     │
│        │                                                │
│        └───────────▶┌─────────────┐                     │
│                     │mock-telegram│  :4021              │
│                     └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- `APP_ENV=e2e` — a custom Symfony environment. The `E2eController` and seed services only exist in DI when `APP_ENV=e2e`. In production (`APP_ENV=prod`) they are completely absent.
- `E2E_MODE=1` — runtime guard as a second safety layer. Every E2E endpoint checks this env var.
- **Ports are offset from dev** (8081, 8026, 4020, 4021) so E2E can run alongside the dev environment without conflicts.
- **Database on tmpfs** — MariaDB data lives in RAM for fast resets.
- **Mock services** — Google OAuth/Contacts and Telegram Bot API are replaced with lightweight Express.js mocks.

## Quick Start

```bash
# 1. Install dependencies and Playwright browsers
make install

# 2. Start the E2E environment (builds Docker images, seeds data)
make up

# 3. Run all tests
make test

# 4. Stop everything when done
make down
```

## Prerequisites

- **Node.js** >= 18
- **Docker** and **Docker Compose** v2
- The `ari/` source directory must be at `../ari` relative to this directory (or set `ARI_SOURCE_DIR`)

## Project Structure

```
ari-e2e/
├── playwright.config.ts          # Playwright configuration
├── Makefile                      # Task runner
├── ARCHITECTURE.md               # Test architecture guide (AI context)
├── .env.example                  # Environment variables template
│
├── docker/
│   ├── compose.e2e.yaml          # Docker Compose (MariaDB)
│   ├── compose.e2e-sqlite.yaml   # Docker Compose (SQLite)
│   ├── mock-google/              # Google OAuth + People API mock
│   └── mock-telegram/            # Telegram Bot API mock
│
├── scripts/
│   ├── setup.sh                  # Start environment + seed
│   ├── teardown.sh               # Stop environment
│   ├── wait-for-ready.sh         # Health check polling
│   └── seed.sh                   # Seed test data
│
└── tests/
    ├── global-setup.ts           # Runs before all tests (DB reset)
    ├── global-teardown.ts        # Runs after all tests (cleanup)
    │
    ├── fixtures/                 # Shared test fixtures
    │   ├── test-data.ts          # Seed data + mock constants
    │   ├── auth.fixture.ts       # Pre-authenticated page (read-only tests)
    │   ├── auth-userb.fixture.ts # Pre-authenticated as User B
    │   └── user-context.fixture.ts  # Isolated user per test
    │
    ├── helpers/                  # Utility functions for tests
    │   ├── auth.helper.ts        # Login helper
    │   ├── mailpit.helper.ts     # Email mock API
    │   ├── mock-google.helper.ts # Google mock admin API
    │   └── mock-telegram.helper.ts # Telegram mock admin API
    │
    ├── pages/                    # Page Object Models
    │   ├── LoginPage.ts
    │   ├── RegisterPage.ts
    │   ├── DashboardPage.ts
    │   ├── ContactsListPage.ts
    │   ├── ContactFormPage.ts
    │   ├── ContactDetailsPage.ts
    │   ├── GroupsListPage.ts
    │   ├── GroupFormPage.ts
    │   ├── NotificationChannelsPage.ts
    │   ├── NotificationChannelFormPage.ts
    │   ├── NotificationPoliciesPage.ts
    │   └── NotificationPolicyFormPage.ts
    │
    ├── auth/                     # Auth flow tests
    │   ├── login.spec.ts
    │   ├── register.spec.ts
    │   └── logout.spec.ts
    ├── contacts/                 # Contacts CRUD + search + isolation
    │   ├── contacts-list.spec.ts
    │   ├── contacts-crud.spec.ts
    │   ├── contacts-search.spec.ts
    │   ├── contact-details.spec.ts
    │   └── tenant-isolation.spec.ts
    ├── groups/                   # Groups CRUD + filtering
    │   ├── groups-crud.spec.ts
    │   └── groups-filter.spec.ts
    ├── dashboard/
    │   └── dashboard.spec.ts
    ├── export/
    │   └── export.spec.ts
    ├── settings/
    │   ├── sessions.spec.ts
    │   └── audit-logs.spec.ts
    ├── notifications/            # Channels, policies, delivery
    │   ├── channels-crud.spec.ts
    │   ├── policies-crud.spec.ts
    │   ├── delivery.spec.ts          # Email delivery via Mailpit
    │   └── telegram-delivery.spec.ts # Telegram delivery via mock
    └── google-import/
        └── google-import.spec.ts     # Google OAuth + contacts import
```

## Make Targets

| Command | Description |
|---------|-------------|
| `make install` | Install npm dependencies and Playwright browsers |
| `make up` | Build and start the E2E Docker environment, wait for health, seed data |
| `make down` | Stop containers, remove volumes |
| `make test` | Run all Playwright tests |
| `make test-ui` | Open Playwright interactive UI mode |
| `make test-smoke` | Run only tests tagged `@smoke` |
| `make test-headed` | Run tests in a visible browser |
| `make seed` | Re-seed the database (without restarting containers) |
| `make reset` | Reset the database via API (faster than re-seeding) |
| `make cleanup` | Remove orphaned test users |
| `make report` | Open the last HTML test report |

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8081` | URL Playwright navigates to |
| `APP_PORT` | `8081` | Host port for the Ari app |
| `MAILPIT_PORT` | `8026` | Host port for Mailpit UI |
| `MOCK_GOOGLE_PORT` | `4020` | Host port for Google mock |
| `MOCK_TELEGRAM_PORT` | `4021` | Host port for Telegram mock |
| `ARI_SOURCE_DIR` | `../ari` | Path to the `ari/` source directory |
| `ARI_IMAGE` | *(empty)* | Pre-built Docker image (skip build if set) |

## How It Works

### Lifecycle

```
make up
  │
  ├── docker compose up --build --wait
  │     Builds app image, starts all services,
  │     waits for healthchecks to pass
  │
  ├── wait-for-ready.sh
  │     Polls GET /api until the app responds (up to 120s)
  │
  └── seed.sh
        Runs `ari:e2e:seed` in the app container.
        Creates 3 users with contacts, groups, and notifications.

make test
  │
  ├── global-setup.ts
  │     POST /api/e2e/reset  — truncates all tables, re-seeds
  │     POST mock:4020/__admin/reset  — clears mock call logs
  │     POST mock:4021/__admin/reset  — clears mock messages
  │
  ├── Test specs run in parallel (2 workers locally, 4 in CI)
  │     Each spec can use fixtures for auth or isolated users
  │
  └── global-teardown.ts
        POST /api/e2e/cleanup-orphaned-users  — removes leftover test users

make down
  └── docker compose down -v --remove-orphans
```

### Seed Data

The `ari:e2e:seed` command creates:

| User | UUID | Password | Data |
|------|------|----------|------|
| User A | `e2e-user` | `e2e-password` | 3 groups (Family, Work, Friends), 10 contacts, notification policy + rule |
| User B | `e2e-user-b` | `e2e-password` | 1 group (Private Group), 1 contact |
| Admin | `e2e-admin` | `e2e-password` | *(no seed data)* |

This data is available as constants in `tests/fixtures/test-data.ts`.

### Test Isolation

Tests that modify data should use the **isolated user fixture** instead of the shared seed users:

```ts
import { test, expect } from '../fixtures/user-context.fixture'

test('my test with isolated data', async ({ userContext }) => {
  // userContext.uuid       — unique user ID (e2e-<timestamp>-<random>)
  // userContext.token      — valid JWT token
  // userContext.email      — user's email
  // userContext.userId     — numeric DB user ID (needed for Telegram webhook)
  // userContext.page       — Playwright page
  // userContext.apiContext — Playwright API request context

  // The user is automatically deleted after the test
})
```

For read-only tests that just need a logged-in session, use the **auth fixture**:

```ts
import { test, expect } from '../fixtures/auth.fixture'

test('my test as logged-in user', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in as e2e-user
  await authenticatedPage.goto('/contacts')
})
```

### Page Object Models

Tests interact with pages through POMs that use `data-testid` selectors:

```ts
const loginPage = new LoginPage(page)
await loginPage.goto()
await loginPage.login('e2e-user', 'e2e-password')
await loginPage.expectRedirectToDashboard()
```

### Test Tags

Tests are tagged for selective execution:

- `@smoke` — critical path, run on every PR
- `@critical` — core functionality that must not break
- `@crud` — CRUD operation tests
- `@notifications` — notification pipeline tests
- `@delivery` — notification delivery tests
- `@google` — Google integration tests
- `@telegram` — Telegram integration tests
- `@slow` — tests that take longer (async processing)

Run tagged tests: `npx playwright test --grep @smoke`

## E2E Backend API

These endpoints only exist when `APP_ENV=e2e` and `E2E_MODE=1`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/e2e/reset` | Truncate all tables and re-seed |
| POST | `/api/e2e/create-user` | Create isolated test user, returns `{ token, email, userId }` |
| DELETE | `/api/e2e/user/{uuid}` | Delete a test user and all their data |
| POST | `/api/e2e/cleanup-orphaned-users` | Remove users matching `e2e-%` except seed users |
| POST | `/api/e2e/exec-command` | Run whitelisted Symfony commands (`ari:notification:generate`, `ari:notification:process`, `messenger:consume`) |
| POST | `/api/e2e/verify-channel/{id}` | Force-verify a notification channel (sets `verifiedAt`) |

## Mock Services

### Google Mock (port 4020)

Implements the full OAuth flow and People/Contact Groups APIs. The backend's `GOOGLE_AUTH_URL` uses `localhost:4020` for browser redirects, while `GOOGLE_TOKEN_URL`, `GOOGLE_PEOPLE_API_URL`, `GOOGLE_GROUPS_API_URL`, and `GOOGLE_PEOPLE_API_BASE_URL` use Docker-internal addresses (`mock-google:4010`).

API endpoints:
- `GET /o/oauth2/v2/auth` — OAuth redirect (returns `code` + `state`)
- `POST /token` — Token exchange (returns mock tokens)
- `GET /v1/people/me/connections` — List contacts (3 mock contacts)
- `GET /v1/people/:resourceName` — Get single contact
- `GET /v1/contactGroups` — List contact groups

Admin endpoints:
- `GET /__admin/calls` — returns all API calls made to the mock
- `POST /__admin/reset` — clears the call log

### Telegram Mock (port 4021)

Implements `sendMessage`, `getMe`, and `setWebhook` endpoints. The backend's `TELEGRAM_API_BASE_URL` points to `mock-telegram:4011`.

Admin endpoints:
- `GET /__admin/messages` — returns all sent messages (`{ chatId, text, timestamp }`)
- `POST /__admin/reset` — clears the message log

### Test Helpers

Helper modules wrap mock admin APIs for convenient use in test specs:

```ts
import { resetGoogleMock, getGoogleCalls } from '../helpers/mock-google.helper'
import { resetTelegramMock, waitForTelegramMessage } from '../helpers/mock-telegram.helper'
import { clearMessages, waitForMessage } from '../helpers/mailpit.helper'
```

## Testing Against Different Versions

The `setup.sh` script supports testing specific branches, commits, PRs, or tags:

```bash
# Test a specific branch
./scripts/setup.sh --branch feature/new-feature

# Test a specific commit
./scripts/setup.sh --commit abc1234

# Test a pull request (requires gh CLI)
./scripts/setup.sh --pr 42

# Test a release tag
./scripts/setup.sh --tag v1.2.0

# Test a pre-built Docker image
./scripts/setup.sh --image aleksejs0/ari-app:latest
```

## SQLite Mode

For faster local iteration, use the SQLite compose file (no separate database container):

```bash
COMPOSE_FILE=docker/compose.e2e-sqlite.yaml make up
make test
COMPOSE_FILE=docker/compose.e2e-sqlite.yaml make down
```

## CI Integration

In CI, the Playwright config automatically adjusts:
- 4 parallel workers
- 2 retries on failure
- Traces and video captured on first retry
- HTML report generated (never auto-opened)
- GitHub Actions reporter enabled

## Troubleshooting

**Port conflict on startup:**
E2E uses ports 8081, 8026, 4020, 4021 by default. If any are in use, override via env vars:
```bash
APP_PORT=9081 MAILPIT_PORT=9026 make up
BASE_URL=http://localhost:9081 make test
```

**Tests fail with connection errors:**
Check that all services are healthy:
```bash
docker compose -f docker/compose.e2e.yaml ps
docker compose -f docker/compose.e2e.yaml logs app
```

**Stale data after code changes:**
Rebuild the app image and re-seed:
```bash
make down
make up
```

**View test results:**
```bash
make report    # Opens the HTML report in browser
```
