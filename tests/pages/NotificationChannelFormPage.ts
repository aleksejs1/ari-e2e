import { type Page, expect } from '@playwright/test'

export class NotificationChannelFormPage {
  constructor(private readonly page: Page) {}

  async selectType(type: string) {
    await this.page.getByTestId('channel-type-select').selectOption(type)
  }

  async fillEmail(email: string) {
    await this.page.getByTestId('channel-email-input').fill(email)
  }

  async save() {
    await this.page.getByTestId('channel-form-save').click()
  }

  async expectVisible() {
    await expect(this.page.locator('[role="dialog"]')).toBeVisible()
  }
}
