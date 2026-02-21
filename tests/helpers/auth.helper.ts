import type { Page } from '@playwright/test'

import { LoginPage } from '../pages/LoginPage'

export async function loginAs(page: Page, uuid: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(uuid, password)
  await loginPage.expectRedirectToDashboard()
}
