import { type Page, expect } from '@playwright/test'

export class ContactsListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/contacts')
  }

  async search(text: string) {
    await this.page.getByTestId('contacts-search-input').fill(text)
    // Wait for debounce
    await this.page.waitForTimeout(500)
  }

  async clearSearch() {
    await this.page.getByTestId('contacts-search-input').clear()
    await this.page.waitForTimeout(500)
  }

  async clickCreate() {
    await this.page.getByTestId('contacts-create-button').click()
  }

  async clickContact(name: string) {
    await this.page.getByTestId('contact-row').filter({ hasText: name }).first().click()
  }

  async expectContactVisible(name: string) {
    await expect(
      this.page.getByTestId('contact-row').filter({ hasText: name }).first(),
    ).toBeVisible()
  }

  async expectContactNotVisible(name: string) {
    await expect(
      this.page.getByTestId('contact-row').filter({ hasText: name }),
    ).toHaveCount(0)
  }

  async expectEmpty() {
    await expect(this.page.getByTestId('contacts-empty')).toBeVisible()
  }

  async getContactCount() {
    await this.page.getByTestId('contact-row').first().waitFor({ timeout: 10000 })
    return this.page.getByTestId('contact-row').count()
  }
}
