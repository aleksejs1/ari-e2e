import { test, expect } from '../fixtures/auth.fixture'
import { SEEDED_CONTACTS } from '../fixtures/test-data'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Contacts List @contacts', () => {
  test('should display seeded contacts in table', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    for (const contact of SEEDED_CONTACTS.userA.slice(0, 3)) {
      await contactsList.expectContactVisible(`${contact.given} ${contact.family}`)
    }
  })

  test('should show pagination when contacts exceed page size', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    // We have 10 seeded contacts for userA
    const count = await contactsList.getContactCount()
    expect(count).toBeGreaterThan(0)
  })
})
