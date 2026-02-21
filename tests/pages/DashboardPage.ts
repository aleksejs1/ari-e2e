import { type Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL('/')
  }

  async openUserMenu() {
    await this.page.getByTestId('user-menu-trigger').click()
  }

  async logout() {
    await this.openUserMenu()
    await this.page.getByTestId('user-menu-logout').click()
  }
}
