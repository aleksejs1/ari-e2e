import { request } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

async function globalSetup() {
  const apiContext = await request.newContext({ baseURL: BASE_URL })

  console.log('Global setup: resetting E2E database...')
  const resetResponse = await apiContext.post('/api/e2e/reset')

  if (!resetResponse.ok()) {
    const body = await resetResponse.text()
    throw new Error(`Failed to reset E2E database: ${resetResponse.status()} ${body}`)
  }

  console.log('Global setup: database reset complete')

  // Reset mock services
  try {
    const mockGooglePort = process.env.MOCK_GOOGLE_PORT ?? '4020'
    const mockTelegramPort = process.env.MOCK_TELEGRAM_PORT ?? '4021'
    await apiContext.post(`http://localhost:${mockGooglePort}/__admin/reset`)
    await apiContext.post(`http://localhost:${mockTelegramPort}/__admin/reset`)
    console.log('Global setup: mock services reset')
  } catch {
    console.log('Global setup: mock services not available (skipping reset)')
  }

  await apiContext.dispose()
}

export default globalSetup
