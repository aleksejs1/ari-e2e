import { test, expect } from '../fixtures/auth.fixture'
import { ContactDetailsPage } from '../pages/ContactDetailsPage'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Contact Details @contacts', () => {
  test('should display seeded contact details', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    // Click on John Doe
    await contactsList.clickContact('John Doe')

    const detailsPage = new ContactDetailsPage(authenticatedPage)
    await detailsPage.expectLoaded()
    await detailsPage.expectName('John Doe')

    // Verify contact info is displayed (use .first() — email also appears in timeline history)
    await expect(authenticatedPage.getByText('john.doe@example.com').first()).toBeVisible()
  })

  test('should export vCard', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.clickContact('John Doe')

    const detailsPage = new ContactDetailsPage(authenticatedPage)
    await detailsPage.expectLoaded()

    const download = await detailsPage.exportVcard()
    const filename = download.suggestedFilename()
    expect(filename).toContain('.vcf')
  })

  test('should navigate back to contacts list', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.clickContact('John Doe')

    const detailsPage = new ContactDetailsPage(authenticatedPage)
    await detailsPage.expectLoaded()

    await detailsPage.goBack()

    await expect(authenticatedPage).toHaveURL(/\/contacts/)
  })
})
