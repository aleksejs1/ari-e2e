import { test as base, type Page } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { LoginPage } from '../pages/LoginPage'

type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.userA.uuid, TEST_USERS.userA.password)
    await loginPage.expectRedirectToDashboard()
    await use(page)
  },
})

export { expect } from '@playwright/test'
