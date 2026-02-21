import { request } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

async function globalTeardown() {
  const apiContext = await request.newContext({ baseURL: BASE_URL })

  console.log('Global teardown: cleaning up orphaned E2E users...')
  try {
    const response = await apiContext.post('/api/e2e/cleanup-orphaned-users')
    if (response.ok()) {
      const body = await response.json()
      console.log(`Global teardown: cleaned up ${body.deleted} orphaned users`)
    }
  } catch {
    console.log('Global teardown: cleanup request failed (environment may be down)')
  }

  await apiContext.dispose()
}

export default globalTeardown
