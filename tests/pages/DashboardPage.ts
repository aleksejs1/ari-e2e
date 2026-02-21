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

  async expectWidget(id: string) {
    await expect(this.page.getByTestId(`widget-${id}`)).toBeVisible()
  }

  async expectWidgetContains(id: string, text: string) {
    await expect(this.page.getByTestId(`widget-${id}`)).toContainText(text)
  }
}
