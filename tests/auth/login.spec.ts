import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-data'
import { LoginPage } from '../pages/LoginPage'

test.describe('Login @smoke @critical', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.userA.uuid, TEST_USERS.userA.password)
    await loginPage.expectRedirectToDashboard()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('wrong-user', 'wrong-pass')
    await loginPage.expectError()
    await loginPage.expectOnLoginPage()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await page.getByTestId('login-submit').click()

    // Form validation should prevent submission — stay on login page
    await expect(page).toHaveURL(/\/login/)
  })
})
