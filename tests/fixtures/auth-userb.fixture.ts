import { test as base, type Page } from '@playwright/test'

import { LoginPage } from '../pages/LoginPage'

import { TEST_USERS } from './test-data'

type AuthUserBFixtures = {
  authenticatedPage: Page
  authenticatedPageB: Page
}

export const test = base.extend<AuthUserBFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.userA.uuid, TEST_USERS.userA.password)
    await loginPage.expectRedirectToDashboard()
    await use(page)
  },

  authenticatedPageB: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.userB.uuid, TEST_USERS.userB.password)
    await loginPage.expectRedirectToDashboard()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
