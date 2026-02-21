import { type Download, type Page, expect } from '@playwright/test'

export class ContactDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/contacts\/\d+/)
  }

  async expectName(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }

  async exportVcard(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.getByTestId('contact-export-vcard').click()
    return downloadPromise
  }

  async clickDelete() {
    await this.page.getByTestId('contact-delete-button').click()
  }

  async confirmDelete() {
    await this.page.getByTestId('delete-dialog-confirm').click()
  }

  async goBack() {
    await this.page.getByTestId('contact-details-back').click()
  }
}
