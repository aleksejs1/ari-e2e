import { type Page } from '@playwright/test'

export class NotificationPolicyFormPage {
  constructor(private readonly page: Page) {}

  async fillName(name: string) {
    await this.page.getByTestId('policy-name-input').fill(name)
  }

  async selectTargetType(type: string) {
    await this.page.getByTestId(`target-type-${type}`).click()
  }

  async fillOffsetDays(days: number) {
    await this.page.getByTestId('schedule-offset-days').fill(String(days))
  }

  async save() {
    await this.page.getByTestId('policy-form-save').click()
  }

  async cancel() {
    await this.page.getByTestId('policy-form-cancel').click()
  }
}
