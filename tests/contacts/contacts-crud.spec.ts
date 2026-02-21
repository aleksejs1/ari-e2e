import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { ContactDetailsPage } from '../pages/ContactDetailsPage'
import { ContactFormPage } from '../pages/ContactFormPage'
import { ContactsListPage } from '../pages/ContactsListPage'

test.describe('Contacts CRUD @contacts @crud @critical', () => {
  test('should create a new contact with name and email', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const contactsList = new ContactsListPage(page)
    await contactsList.goto()

    await contactsList.clickCreate()

    const contactForm = new ContactFormPage(page)
    await contactForm.expectVisible()
    await contactForm.fillName('E2E', 'TestContact')
    await contactForm.fillEmail('e2e-test@example.com')
    await contactForm.save()

    // Wait for dialog to close and list to refresh
    await expect(page.getByTestId('contact-form-dialog')).toBeHidden()

    // Verify contact appears in list
    await contactsList.expectContactVisible('E2E TestContact')
  })

  test('should delete a contact from details page', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const contactsList = new ContactsListPage(page)
    await contactsList.goto()

    // First create a contact to delete
    await contactsList.clickCreate()
    const contactForm = new ContactFormPage(page)
    await contactForm.expectVisible()
    await contactForm.fillName('ToDelete', 'Contact')
    await contactForm.save()
    await expect(page.getByTestId('contact-form-dialog')).toBeHidden()

    // Navigate to the contact's details
    await contactsList.clickContact('ToDelete Contact')

    const detailsPage = new ContactDetailsPage(page)
    await detailsPage.expectLoaded()

    // Delete the contact
    await detailsPage.clickDelete()
    await detailsPage.confirmDelete()

    // Should navigate back to contacts list
    await page.waitForURL(/\/contacts/, { timeout: 10000 })

    // Verify contact is gone
    await contactsList.expectContactNotVisible('ToDelete Contact')
  })
})
