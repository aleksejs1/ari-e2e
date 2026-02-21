import { type Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.page.getByTestId('login-username').fill(username)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
  }

  async expectError(text?: string) {
    const errorEl = this.page.getByTestId('login-error')
    await expect(errorEl).toBeVisible()
    if (text) {
      await expect(errorEl).toContainText(text)
    }
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('/', { timeout: 10000 })
    await expect(this.page).toHaveURL('/')
  }

  async expectOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/)
  }
}
