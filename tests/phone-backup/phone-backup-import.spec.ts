import path from 'path'

import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { ContactDetailsPage } from '../pages/ContactDetailsPage'
import { ContactsListPage } from '../pages/ContactsListPage'
import { PhoneBackupImportPage } from '../pages/PhoneBackupImportPage'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

const SMS_FIXTURE = path.resolve(__dirname, '../../fixtures/sms-sample.xml')
const CALLS_FIXTURE = path.resolve(__dirname, '../../fixtures/calls-sample.xml')

test.describe('Phone Backup Import @phone-backup @slow', () => {
  test('should import SMS file and create message interaction', async ({ userContext }) => {
    const { token, apiContext, page, uuid, password } = userContext
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // 1. Create a contact with the phone number used in the fixture.
    const contactResp = await apiContext.post(`${BASE_URL}/api/contacts`, { headers, data: {} })
    expect(contactResp.ok()).toBeTruthy()
    const contact = await contactResp.json()
    const contactIri: string = contact['@id']

    const phoneResp = await apiContext.post(`${BASE_URL}/api/contact_phone_numbers`, {
      headers,
      data: { contact: contactIri, value: '+37129837434', type: 'mobile' },
    })
    expect(phoneResp.ok()).toBeTruthy()

    // 2. Login and navigate to Settings → Data.
    await loginAs(page, uuid, password)

    const importPage = new PhoneBackupImportPage(page)
    await importPage.goto()

    // 3. Upload the SMS fixture.
    await importPage.uploadFile(SMS_FIXTURE)
    await importPage.expectImportButtonEnabled()

    // 4. Click Import and wait for success banner.
    await importPage.clickImport()
    await importPage.expectSuccessBanner()

    // 5. Flush the Messenger queue so the import handler runs synchronously.
    const consumeResp = await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: { command: 'messenger:consume', limit: 5 },
    })
    const consumeBody = await consumeResp.json()
    expect(consumeBody.status).toBe('ok')

    // 6. Navigate to the contact and verify 1 message interaction was created.
    const contactsList = new ContactsListPage(page)
    await contactsList.goto()

    // The contact has a phone but no name — search by navigating directly via API id.
    const contactId = String(contact.id)
    await page.goto(`/contacts/${contactId}`)

    const detailsPage = new ContactDetailsPage(page)
    await detailsPage.expectLoaded()

    // The interaction timeline should contain "3 messages".
    await expect(page.getByText(/3 messages/)).toBeVisible({ timeout: 10000 })
  })

  test('should import calls file and create call interactions', async ({ userContext }) => {
    const { token, apiContext, page, uuid, password } = userContext
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // 1. Create contact with matching phone.
    const contactResp = await apiContext.post(`${BASE_URL}/api/contacts`, { headers, data: {} })
    expect(contactResp.ok()).toBeTruthy()
    const contact = await contactResp.json()
    const contactIri: string = contact['@id']

    await apiContext.post(`${BASE_URL}/api/contact_phone_numbers`, {
      headers,
      data: { contact: contactIri, value: '+37129837434', type: 'mobile' },
    })

    // 2. Login and upload calls fixture.
    await loginAs(page, uuid, password)

    const importPage = new PhoneBackupImportPage(page)
    await importPage.goto()
    await importPage.uploadFile(CALLS_FIXTURE)
    await importPage.clickImport()
    await importPage.expectSuccessBanner()

    // 3. Consume queue.
    const consumeResp = await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: { command: 'messenger:consume', limit: 5 },
    })
    expect((await consumeResp.json()).status).toBe('ok')

    // 4. Verify 2 call interactions visible in contact timeline.
    await page.goto(`/contacts/${String(contact.id)}`)
    const detailsPage = new ContactDetailsPage(page)
    await detailsPage.expectLoaded()

    await expect(page.getByText(/Incoming call/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Outgoing call/)).toBeVisible({ timeout: 10000 })
  })

  test('should not import when no file is selected (button disabled)', async ({
    userContext,
  }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const importPage = new PhoneBackupImportPage(page)
    await importPage.goto()

    await importPage.expectImportButtonDisabled()
  })

  test('tenant isolation — import does not affect another user contacts', async ({
    userContext,
    request,
  }) => {
    const { token, apiContext, page, uuid, password } = userContext
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // Create User B (isolated).
    const userBUuid = `e2e-isolation-${Date.now()}`
    const userBResp = await request.post(`${BASE_URL}/api/e2e/create-user`, {
      data: { uuid: userBUuid, password: 'e2e-password' },
    })
    expect(userBResp.ok()).toBeTruthy()
    const userBBody = await userBResp.json()
    const userBToken: string = userBBody.token

    // Count interactions for User B before import.
    const beforeResp = await request.get(`${BASE_URL}/api/contact_interactions`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    })
    const beforeData = await beforeResp.json()
    const countBefore: number = beforeData['hydra:totalItems'] ?? 0

    // User A: create a contact with the fixture phone and import.
    const contactResp = await apiContext.post(`${BASE_URL}/api/contacts`, { headers, data: {} })
    const contact = await contactResp.json()
    await apiContext.post(`${BASE_URL}/api/contact_phone_numbers`, {
      headers,
      data: { contact: contact['@id'], value: '+37129837434', type: 'mobile' },
    })

    await loginAs(page, uuid, password)
    const importPage = new PhoneBackupImportPage(page)
    await importPage.goto()
    await importPage.uploadFile(SMS_FIXTURE)
    await importPage.clickImport()
    await importPage.expectSuccessBanner()

    await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: { command: 'messenger:consume', limit: 5 },
    })

    // Verify User B's interaction count is unchanged.
    const afterResp = await request.get(`${BASE_URL}/api/contact_interactions`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    })
    const afterData = await afterResp.json()
    const countAfter: number = afterData['hydra:totalItems'] ?? 0

    expect(countAfter).toBe(countBefore)

    // Cleanup User B.
    await request.delete(`${BASE_URL}/api/e2e/user/${userBUuid}`)
  })
})
