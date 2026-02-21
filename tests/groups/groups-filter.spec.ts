import { test, expect } from '../fixtures/auth.fixture'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Groups Filter @groups', () => {
  test('should filter contacts by clicking group in sidebar', async ({ authenticatedPage }) => {
    // Navigate to contacts first to ensure sidebar is visible
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    // Click on "Family" group in the sidebar
    const sidebar = authenticatedPage.getByTestId('sidebar-groups-section')
    await sidebar.getByText('Family').click()

    // URL should contain group filter
    await expect(authenticatedPage).toHaveURL(/[?&]group=/)

    // Should show contacts in Family group
    // (depends on seed data — John Doe is in Family group)
    const contactCount = await contactsList.getContactCount()
    expect(contactCount).toBeGreaterThan(0)
  })
})
