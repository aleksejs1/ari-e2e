import { type Page, expect } from '@playwright/test'

export class GroupFormPage {
  constructor(private readonly page: Page) {}

  async fillName(name: string) {
    await this.page.getByTestId('group-name-input').fill(name)
  }

  async save() {
    await this.page.getByTestId('group-form-save').click()
  }

  async cancel() {
    await this.page.getByTestId('group-form-cancel').click()
  }

  async expectVisible() {
    await expect(this.page.getByTestId('group-form-dialog')).toBeVisible()
  }
}
