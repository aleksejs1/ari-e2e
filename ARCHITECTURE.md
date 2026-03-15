# E2E Test Architecture

This document describes the architecture and conventions for adding new E2E tests. It is intended as context for both developers and AI assistants.

## Environment

The E2E suite runs against a Docker environment that mirrors production:

| Service | Internal Port | Host Port | Purpose |
|---|---|---|---|
| `app` (Ari) | 8080 | 8081 | Application (`APP_ENV=e2e`, `E2E_MODE=1`) |
| `database` | 3306 | — | MariaDB on tmpfs (RAM) |
| `mailpit` | 1025/8025 | 8026 | SMTP capture + REST API |
| `mock-google` | 4010 | 4020 | Google OAuth + People API mock |
| `mock-telegram` | 4011 | 4021 | Telegram Bot API mock |

Config: `docker/compose.e2e.yaml`

## Test Isolation Model

Every test that mutates data **must** use the `userContext` fixture. This creates a fresh user before the test and deletes it after:

```ts
import { test, expect } from '../fixtures/user-context.fixture'

test('example', async ({ userContext }) => {
  const { uuid, password, email, token, userId, page, apiContext } = userContext
  // Each test gets its own tenant — no cross-test interference
})
```

Read-only tests may use `auth.fixture.ts` (logged in as seed User A).

## File Structure Conventions

```
tests/
├── fixtures/        # Playwright fixtures (userContext, auth)
├── helpers/         # Utility functions (mailpit, mock-google, mock-telegram, auth)
├── pages/           # Page Object Models (one class per UI page)
├── <feature>/       # Test specs grouped by feature
│   └── <feature>.spec.ts
```

### Adding a New Test

1. **Create the spec file** in the appropriate feature directory: `tests/<feature>/<name>.spec.ts`
2. **Use `userContext`** for any test that creates/modifies/deletes data
3. **Use Page Objects** from `tests/pages/` — do not hardcode selectors in specs
4. **Tag the test** in the `describe` block name: `@smoke`, `@critical`, `@crud`, `@notifications`, etc.

### Adding a New Page Object

Create `tests/pages/<PageName>.ts`:

```ts
import { type Page, expect } from '@playwright/test'

export class MyPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/my-route')
  }

  async expectItemVisible(name: string) {
    await expect(
      this.page.getByTestId('item-row').filter({ hasText: name }).first(),
    ).toBeVisible()
  }
}
```

Rules for locators:
- Prefer `data-testid` attributes (`page.getByTestId()`)
- Use `page.getByLabel()` for form inputs
- Use `page.getByText()` only for dynamic data you created in the test

## Backend E2E API

These endpoints only exist when `APP_ENV=e2e` and `E2E_MODE=1`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/e2e/reset` | POST | Truncate all tables, re-seed base data |
| `/api/e2e/create-user` | POST | Create isolated user, returns `{ token, email, userId }` |
| `/api/e2e/user/{uuid}` | DELETE | Delete user and all cascade data |
| `/api/e2e/cleanup-orphaned-users` | POST | Remove leftover `e2e-*` users |
| `/api/e2e/exec-command` | POST | Run whitelisted commands: `ari:notification:generate`, `ari:notification:process`, `messenger:consume` |
| `/api/e2e/verify-channel/{id}` | POST | Force-verify a notification channel |

## Seed Data

Global setup (`tests/global-setup.ts`) calls `POST /api/e2e/reset` which creates:

| User | UUID | Contacts | Groups | Notifications |
|---|---|---|---|---|
| User A | `e2e-user` | 10 | 3 (Family, Work, Friends) | 1 web channel, 1 policy, 1 rule |
| User B | `e2e-user-b` | 1 | 1 (Private Group) | — |
| Admin | `e2e-admin` | — | — | — |

Constants in `tests/fixtures/test-data.ts`.

## External Service Testing Patterns

### Pattern: API-Driven Flow (no browser interaction with external service)

For flows like Google Import where the backend communicates with external APIs:

```ts
// 1. Reset mock state
await resetGoogleMock()

// 2. Call backend API endpoints that trigger external calls
const { url } = await api.get('/api/connect/google')
const state = new URL(url).searchParams.get('state')
await api.get(`/api/connect/google/check?code=mock-auth-code&state=${state}`)

// 3. Trigger async processing
await api.post('/api/google/import', { data: {} })
await api.post('/api/e2e/exec-command', { data: { command: 'messenger:consume', limit: 10 } })

// 4. Verify results in UI
await contactsPage.expectContactVisible('Contact-mock-1')
```

### Pattern: Notification Delivery via External Channel

For Telegram, the flow involves creating a channel, simulating a webhook, and checking the mock:

```ts
// 1. Reset mock
await resetTelegramMock()

// 2. Create channel + simulate webhook to link chatId
const { id: channelId } = await api.post('/api/notification_channels', { data: { type: 'telegram', config: {} } })
await api.post('/api/webhook/telegram', {
  data: { message: { text: `/start ${userId}_${channelId}`, chat: { id: 99999 } } },
})

// 3. Verify channel, create policy, generate + process
await api.post('/api/e2e/verify-channel/' + channelId)
// ... create policy, generate, process ...

// 4. Assert mock received the message
const msg = await waitForTelegramMessage({ chatId: '99999' })
expect(msg.text).toBeTruthy()
```

### Pattern: Email Verification via Mailpit

```ts
await clearMessages()
// ... trigger email sending ...
const msg = await waitForMessage({ to: userContext.email, timeout: 15000 })
expect(msg.Subject).toContain('expected subject')
```

## Mock Helper API

| Module | Functions |
|---|---|
| `helpers/mock-google.helper.ts` | `resetGoogleMock()`, `getGoogleCalls()` |
| `helpers/mock-telegram.helper.ts` | `resetTelegramMock()`, `getTelegramMessages()`, `waitForTelegramMessage({ chatId?, timeout? })` |
| `helpers/mailpit.helper.ts` | `clearMessages()`, `getMessages()`, `waitForMessage({ to?, subject?, timeout? })` |
| `helpers/auth.helper.ts` | `loginAs(page, uuid, password)` |

## API Key Testing

### Rate-limit header assertions

Every response from an API key session includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. To assert them in a test:

```ts
const response = await apiContext.get('/api/contacts', {
  headers: { Authorization: `Bearer ${apiKeyToken}` },
})
expect(response.headers()['x-ratelimit-limit']).toBeDefined()
expect(response.headers()['x-ratelimit-remaining']).toBeDefined()
```

### Triggering a 429 in tests

The default rate limit is 1 000 req/hour — impractical to exhaust in a test. Set `API_KEY_RATE_LIMIT=5` in the E2E environment to lower the limit to 5 requests per minute:

```yaml
# docker/compose.e2e.yaml
app:
  environment:
    API_KEY_RATE_LIMIT: 5
```

Then make 6 requests with the same key and assert the 6th returns `429 Too Many Requests`.

### Scope isolation pattern

```ts
test('read-only key cannot create contacts @api-keys', async ({ userContext }) => {
  // 1. Create a key with contacts:read scope only
  const resp = await userContext.apiContext.post('/api/api_keys', {
    data: { name: 'Read-only', scopes: ['contacts:read'] },
    headers: { Authorization: `Bearer ${userContext.token}` },
  })
  const { token } = await resp.json()

  // 2. Attempt a POST with the restricted key
  const create = await userContext.apiContext.post('/api/contacts', {
    data: {},
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(create.status()).toBe(403)
})
```

### Tenant isolation pattern

A key created by User A must not be usable by User B (different tenant). The `ApiKey` entity implements `TenantAwareInterface`, so `TenantFilter` applies automatically.

## Configurable Backend URLs

All external service URLs are configurable via environment variables with production defaults:

| Env Variable | Used By |
|---|---|
| `GOOGLE_AUTH_URL` | `GoogleOAuthService` — OAuth authorization URL |
| `GOOGLE_TOKEN_URL` | `GoogleOAuthService` — token exchange |
| `GOOGLE_PEOPLE_API_URL` | `GoogleContactsService` — list connections |
| `GOOGLE_GROUPS_API_URL` | `GoogleContactsService` — list contact groups |
| `GOOGLE_PEOPLE_API_BASE_URL` | `ImportGoogleContactHandler`, `GoogleContactUpdateService` — single person fetch |
| `TELEGRAM_API_BASE_URL` | `TelegramService` — send message |

Defaults are in `ari/core/config/parameters.yaml`. E2E overrides are in `docker/compose.e2e.yaml`.
