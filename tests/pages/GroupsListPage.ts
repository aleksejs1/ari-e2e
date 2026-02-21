import { type Page, expect } from '@playwright/test'

export class GroupsListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/groups')
  }

  async clickCreate() {
    await this.page.getByTestId('groups-create-button').click()
  }

  async expectGroupVisible(name: string) {
    await expect(this.page.getByRole('cell', { name })).toBeVisible()
  }

  async expectGroupNotVisible(name: string) {
    await expect(this.page.getByRole('cell', { name })).toHaveCount(0)
  }

  async deleteGroup(name: string) {
    // Find the row containing the group name and click its delete button
    const row = this.page.getByRole('row').filter({ hasText: name })
    await row.locator('[data-testid^="group-delete-"]').click()
  }
}
