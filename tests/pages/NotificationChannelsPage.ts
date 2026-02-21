import { type Page, expect } from '@playwright/test'

export class NotificationChannelsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/notification-channels')
  }

  async clickAdd() {
    await this.page.getByTestId('channel-add-button').click()
  }

  async expectChannelVisible(type: string) {
    await expect(
      this.page.getByTestId('channel-row').filter({ hasText: type }).first(),
    ).toBeVisible()
  }

  async expectChannelNotVisible(type: string) {
    await expect(
      this.page.getByTestId('channel-row').filter({ hasText: type }),
    ).toHaveCount(0)
  }

  async deleteChannel(type: string) {
    const row = this.page.getByTestId('channel-row').filter({ hasText: type })
    await row.getByTestId('channel-delete-button').click()
  }
}
