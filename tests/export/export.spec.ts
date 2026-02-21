import { test, expect } from '../fixtures/auth.fixture'
import { ContactDetailsPage } from '../pages/ContactDetailsPage'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Export @export', () => {
  test('should export contacts from data settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings/data')

    const downloadPromise = authenticatedPage.waitForEvent('download')
    await authenticatedPage.getByTestId('export-data-button').click()
    const download = await downloadPromise

    const filename = download.suggestedFilename()
    expect(filename).toBeTruthy()
  })

  test('should export single contact as vCard', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.clickContact('John Doe')

    const detailsPage = new ContactDetailsPage(authenticatedPage)
    await detailsPage.expectLoaded()

    const download = await detailsPage.exportVcard()
    const filename = download.suggestedFilename()
    expect(filename).toContain('.vcf')
  })
})
