import { type Page, expect } from '@playwright/test'

export class ContactFormPage {
  constructor(private readonly page: Page) {}

  async fillName(given: string, family: string) {
    await this.page.getByTestId('contact-first-name').fill(given)
    await this.page.getByTestId('contact-last-name').fill(family)
  }

  async fillEmail(email: string) {
    await this.page.getByTestId('contact-email-input').first().fill(email)
  }

  async fillPhone(phone: string) {
    await this.page.getByTestId('contact-phone-input').first().fill(phone)
  }

  async save() {
    await this.page.getByTestId('contact-form-save').click()
  }

  async cancel() {
    await this.page.getByTestId('contact-form-cancel').click()
  }

  async expectVisible() {
    await expect(this.page.getByTestId('contact-form-dialog')).toBeVisible()
  }
}
