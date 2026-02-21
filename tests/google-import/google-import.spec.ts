import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { resetGoogleMock } from '../helpers/mock-google.helper'
import { MOCK_GOOGLE } from '../fixtures/test-data'
import { ContactsListPage } from '../pages/ContactsListPage'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

test.describe('Google Import @google @slow', () => {
  test('should connect Google account and import contacts', async ({ userContext }) => {
    const { token, apiContext, page, uuid, password } = userContext

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    // 1. Reset Google mock
    await resetGoogleMock()

    // 2. Start Google OAuth flow — get the authorization URL
    const connectResponse = await apiContext.get(`${BASE_URL}/api/connect/google`, {
      headers,
    })
    if (!connectResponse.ok()) {
      const body = await connectResponse.text()
      throw new Error(`connect/google failed: ${connectResponse.status()} — ${body}`)
    }
    const connectData = await connectResponse.json()
    const authUrl: string = connectData.url
    expect(authUrl).toBeTruthy()

    // 3. Parse state from the auth URL
    const url = new URL(authUrl)
    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()

    // 4. Simulate OAuth callback with mock auth code
    const checkResponse = await apiContext.get(
      `${BASE_URL}/api/connect/google/check?code=mock-auth-code&state=${state}`,
    )
    if (!checkResponse.ok()) {
      const body = await checkResponse.text()
      throw new Error(`connect/google/check failed: ${checkResponse.status()} — ${body}`)
    }
    const checkData = await checkResponse.json()
    expect(checkData.success).toBe(true)

    // 5. Trigger Google contacts import
    const importResponse = await apiContext.post(`${BASE_URL}/api/google/import`, {
      headers,
      data: {},
    })
    if (!importResponse.ok()) {
      const body = await importResponse.text()
      throw new Error(`google/import failed: ${importResponse.status()} — ${body}`)
    }
    const importData = await importResponse.json()
    expect(importData.imported).toBe(MOCK_GOOGLE.count)

    // 6. Consume async messages (processes individual contact imports)
    const consumeResponse = await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: {
        command: 'messenger:consume',
        limit: 10,
      },
    })
    const consumeBody = await consumeResponse.json()
    if (!consumeResponse.ok() || consumeBody.status !== 'ok') {
      throw new Error(`messenger:consume failed: ${JSON.stringify(consumeBody)}`)
    }

    // 7. Login and verify contacts appear in UI
    await loginAs(page, uuid, password)

    const contactsPage = new ContactsListPage(page)
    await contactsPage.goto()

    // 8. Verify each mock Google contact is visible
    for (const contact of MOCK_GOOGLE.contacts) {
      await contactsPage.expectContactVisible(contact.family)
    }
  })
})
