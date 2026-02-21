import { test, expect } from '../fixtures/auth.fixture'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Contacts Search @contacts', () => {
  test('should filter contacts by search term', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.search('John')

    await contactsList.expectContactVisible('John Doe')
    await contactsList.expectContactNotVisible('Jane Smith')
  })

  test('should show empty state for no results', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.search('NonExistentContactXYZ')

    await contactsList.expectEmpty()
  })

  test('should update URL with search parameter', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.search('John')

    await expect(authenticatedPage).toHaveURL(/[?&]search=John/)
  })
})
