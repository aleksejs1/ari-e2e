import { type Page, expect } from '@playwright/test'

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/register')
  }

  async register(uuid: string, password: string) {
    await this.page.getByTestId('register-uuid').fill(uuid)
    await this.page.getByTestId('register-password').fill(password)
    await this.page.getByTestId('register-confirm-password').fill(password)
    await this.page.getByTestId('register-submit').click()
  }

  async expectError(text?: string) {
    const errorEl = this.page.getByTestId('register-error')
    await expect(errorEl).toBeVisible()
    if (text) {
      await expect(errorEl).toContainText(text)
    }
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('/', { timeout: 10000 })
    await expect(this.page).toHaveURL('/')
  }
}
