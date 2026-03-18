import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { DashboardPage } from '../pages/DashboardPage'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

async function apiPost(
  apiContext: APIRequestContext,
  url: string,
  token: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await apiContext.post(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/ld+json',
    },
    data,
  })
  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`POST ${url} failed: ${response.status()} — ${body}`)
  }
  return response.json()
}

async function apiPatch(
  apiContext: APIRequestContext,
  url: string,
  token: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await apiContext.patch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/merge-patch+json',
    },
    data,
  })
  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`PATCH ${url} failed: ${response.status()} — ${body}`)
  }
  return response.json()
}

function extractId(iri: string): string {
  const id = iri.split('/').pop()
  if (!id) throw new Error(`Cannot extract id from IRI: ${iri}`)
  return id
}

test.describe('Interactions & Cadence @interactions @critical', () => {
  test('should log an interaction on a contact detail page', async ({ userContext }) => {
    const { uuid, password, token, page, apiContext } = userContext

    // Create a contact via API
    const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Interaction', family: 'Tester' }],
    })
    const contactId = extractId(contact['@id'] as string)

    await loginAs(page, uuid, password)
    await page.goto(`/contacts/${contactId}`)
    await expect(page).toHaveURL(/\/contacts\/\d+/)

    // Click "Log Interaction" button in the Keep in Touch section
    await page.getByRole('button', { name: 'Log Interaction' }).first().click()

    // Drawer opens
    await expect(page.getByText('Log Interaction').first()).toBeVisible()

    // Fill in description
    const description = 'Called to catch up about the project'
    await page.getByLabel('Description').fill(description)

    // Save the interaction
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify the interaction appears in the timeline
    await expect(page.getByText(description)).toBeVisible()
  })

  test('should set a cadence on a contact detail page', async ({ userContext }) => {
    const { uuid, password, token, page, apiContext } = userContext

    // Create a contact via API
    const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Cadence', family: 'Tester' }],
    })
    const contactId = extractId(contact['@id'] as string)

    await loginAs(page, uuid, password)
    await page.goto(`/contacts/${contactId}`)
    await expect(page).toHaveURL(/\/contacts\/\d+/)

    // Click "Set cadence..." prompt to enter edit mode
    await page.getByText('Set cadence...').click()

    // Fill in the number input
    const cadenceInput = page.getByPlaceholder('Days')
    await cadenceInput.fill('30')

    // Tab to the confirm (check) button and activate it
    await cadenceInput.press('Tab')
    await page.keyboard.press('Space')

    // Cadence is now set — the editor shows "Every 30 days"
    await expect(page.getByText('Every 30 days')).toBeVisible()
  })

  test('should show overdue contact in Catch Up widget and allow logging from it', async ({
    userContext,
  }) => {
    const { uuid, password, token, page, apiContext } = userContext

    // Create a contact with cadenceDays=1 and an old interaction (always overdue)
    const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Overdue', family: 'Contact' }],
    })
    const contactIri = contact['@id'] as string
    const contactId = extractId(contactIri)

    await apiPatch(apiContext, `${BASE_URL}/api/contacts/${contactId}`, token, {
      cadenceDays: 1,
    })
    await apiPost(apiContext, `${BASE_URL}/api/contact_interactions`, token, {
      contact: contactIri,
      type: 'call',
      timestamp: '2020-01-01T12:00:00+00:00',
      description: '',
    })

    await loginAs(page, uuid, password)

    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    // Catch Up widget should be visible and show the overdue contact
    const catchUpWidget = page.getByTestId('widget-catchUp')
    await expect(catchUpWidget).toBeVisible()
    await expect(catchUpWidget).toContainText('Overdue Contact')

    // Click "Log Interaction" inside the widget
    await catchUpWidget.getByRole('button', { name: 'Log Interaction' }).click()

    // InteractionEditDrawer opens
    await expect(page.getByText('Log Interaction').first()).toBeVisible()

    // Fill in description (required by the backend) and save
    await page.getByLabel('Description').fill('Quick catch-up logged from widget')
    await page.getByRole('button', { name: 'Save' }).click()

    // Drawer closes after save
    await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible()
  })

  test('should not show another tenant overdue contacts in Catch Up widget', async ({
    userContext,
    request,
  }) => {
    const { token, apiContext } = userContext
    let userBUuid: string | undefined

    try {
      // User A: create a contact with overdue cadence
      const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
        contactNames: [{ given: 'User A', family: 'Overdue' }],
      })
      const contactIri = contact['@id'] as string
      const contactId = extractId(contactIri)

      await apiPatch(apiContext, `${BASE_URL}/api/contacts/${contactId}`, token, {
        cadenceDays: 1,
      })
      await apiPost(apiContext, `${BASE_URL}/api/contact_interactions`, token, {
        contact: contactIri,
        type: 'call',
        timestamp: '2020-01-01T12:00:00+00:00',
        description: '',
      })

      // Create User B
      userBUuid = `e2e-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const createResp = await request.post(`${BASE_URL}/api/e2e/create-user`, {
        data: { uuid: userBUuid, password: 'e2e-password' },
      })
      if (!createResp.ok()) {
        throw new Error(`Failed to create User B: ${createResp.status()}`)
      }

      // Login as User B
      const { page } = userContext
      await loginAs(page, userBUuid, 'e2e-password')

      const dashboard = new DashboardPage(page)
      await dashboard.goto()

      // User B's Catch Up widget should not show User A's overdue contact
      const catchUpWidget = page.getByTestId('widget-catchUp')
      await expect(catchUpWidget).toBeVisible()
      await expect(catchUpWidget).toContainText("You're all caught up!")
      await expect(catchUpWidget).not.toContainText('User A Overdue')
    } finally {
      if (userBUuid) {
        try {
          await request.delete(`${BASE_URL}/api/e2e/user/${userBUuid}`)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  })
})
