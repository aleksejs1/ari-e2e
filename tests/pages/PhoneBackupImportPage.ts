import { type Page, expect } from '@playwright/test'

export class PhoneBackupImportPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/data')
    await this.page.waitForLoadState('networkidle')
  }

  async uploadFile(filePath: string) {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.getByTestId('phone-backup-file-input').dispatchEvent('click'),
    ])
    await fileChooser.setFiles(filePath)
  }

  async clickImport() {
    await this.page.getByTestId('phone-backup-import-button').click()
  }

  async expectSuccessBanner() {
    await expect(this.page.getByTestId('phone-backup-import-success')).toBeVisible({
      timeout: 10000,
    })
  }

  async expectErrorBanner() {
    await expect(this.page.getByTestId('phone-backup-import-error')).toBeVisible({ timeout: 5000 })
  }

  async expectImportButtonEnabled() {
    await expect(this.page.getByTestId('phone-backup-import-button')).toBeEnabled()
  }

  async expectImportButtonDisabled() {
    await expect(this.page.getByTestId('phone-backup-import-button')).toBeDisabled()
  }
}
