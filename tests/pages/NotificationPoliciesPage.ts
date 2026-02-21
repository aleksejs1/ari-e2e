import { type Page, expect } from '@playwright/test'

export class NotificationPoliciesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/notification-policies')
  }

  async clickCreate() {
    await this.page.getByTestId('policy-create-button').click()
  }

  async expectPolicyVisible(name: string) {
    await expect(
      this.page.getByTestId('policy-row').filter({ hasText: name }).first(),
    ).toBeVisible()
  }

  async expectPolicyNotVisible(name: string) {
    await expect(
      this.page.getByTestId('policy-row').filter({ hasText: name }),
    ).toHaveCount(0)
  }

  async deletePolicy(name: string) {
    const row = this.page.getByTestId('policy-row').filter({ hasText: name })
    await row.getByTestId('policy-delete-button').click()
  }
}
