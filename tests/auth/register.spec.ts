import { test, expect } from '@playwright/test'
import { RegisterPage } from '../pages/RegisterPage'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

test.describe('Register @critical', () => {
  test('should register a new user, auto-login, and redirect to dashboard', async ({ page, request }) => {
    const uuid = `e2e-reg-${Date.now()}`
    const registerPage = new RegisterPage(page)
    await registerPage.goto()
    await registerPage.register(uuid, 'test-password-123')
    await registerPage.expectRedirectToDashboard()

    // Cleanup: delete the created user
    await request.delete(`${BASE_URL}/api/e2e/user/${uuid}`)
  })

  test('should show error for duplicate uuid', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    // e2e-user already exists from seed
    await registerPage.register('e2e-user', 'some-password-123')
    await registerPage.expectError()
  })
})
