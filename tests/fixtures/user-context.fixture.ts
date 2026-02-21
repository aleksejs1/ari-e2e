import { test as base, type Page, type APIRequestContext } from '@playwright/test'

interface UserContext {
  uuid: string
  password: string
  email: string
  token: string
  userId: number
  page: Page
  apiContext: APIRequestContext
}

type UserContextFixtures = {
  userContext: UserContext
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

export const test = base.extend<UserContextFixtures>({
  userContext: async ({ page, request }, use) => {
    // Create isolated user via E2E API
    const uuid = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const password = 'e2e-password'

    const response = await request.post(`${BASE_URL}/api/e2e/create-user`, {
      data: { uuid, password },
    })

    if (!response.ok()) {
      throw new Error(`Failed to create test user: ${response.status()}`)
    }

    const body = await response.json()

    const userContext: UserContext = {
      uuid,
      password,
      email: body.email,
      token: body.token,
      userId: body.userId,
      page,
      apiContext: request,
    }

    await use(userContext)

    // Cleanup: delete user after test
    try {
      await request.delete(`${BASE_URL}/api/e2e/user/${uuid}`)
    } catch {
      // Ignore cleanup errors
    }
  },
})

export { expect } from '@playwright/test'
