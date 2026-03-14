import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { ContactsListPage } from '../pages/ContactsListPage'
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

test.describe('Export/Import Rich Contact Data @export @critical @slow', () => {
  test('should export rich contact data and import it into another user', async ({
    userContext,
  }) => {
    test.slow()

    const { uuid, password, token, page, apiContext } = userContext
    let userBUuid: string | undefined

    try {
      // === Phase 1: Create test data via API (User A) ===

      // Create Contact B (relation target)
      const contactB = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
        contactNames: [{ given: 'Bob', family: 'Johnson' }],
      })

      // Create Contact C (relation target)
      const contactC = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
        contactNames: [{ given: 'Carol', family: 'Williams' }],
      })

      // Create Contact A (main contact with all child entities)
      await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
        contactNames: [
          { given: 'Aleksei', family: 'Ivanov' },
          { given: 'Alex', family: 'Smith' },
        ],
        phoneNumbers: [
          { value: '+1234567890', type: 'mobile' },
          { value: '+0987654321', type: 'work' },
        ],
        contactEmailAdresses: [
          { value: 'alex@example.com', type: 'personal' },
          { value: 'alex.work@example.com', type: 'work' },
        ],
        contactDates: [
          { date: '1990-01-15', text: 'Birthday' },
          { date: '2020-06-01', text: 'Anniversary' },
        ],
        contactAddresses: [
          { street: '123 Main St', city: 'New York' },
          { street: '456 Oak Ave', city: 'London' },
        ],
        contactOrganizations: [
          { name: 'Acme Corp', title: 'Engineer' },
          { name: 'Tech Inc', title: 'CTO' },
        ],
        contactBiographies: [
          { value: 'Software engineer', type: 'notes' },
          { value: 'Loves hiking', type: 'summary' },
        ],
        contactRelations: [
          { relatedContact: contactB['@id'], type: 'friend' },
          { relatedContact: contactC['@id'], type: 'colleague' },
        ],
      })

      // === Phase 2: Export via UI (User A) ===
      await loginAs(page, uuid, password)
      await page.goto('/settings/data')

      const downloadPromise = page.waitForEvent('download')
      await page.getByTestId('export-data-button').click()
      const download = await downloadPromise
      const filePath = await download.path()
      if (!filePath) {
        throw new Error('Export file download failed — no file path')
      }

      // === Phase 3: Logout ===
      const dashboard = new DashboardPage(page)
      await dashboard.goto()
      await dashboard.logout()

      // === Phase 4: Create User B and Login ===
      userBUuid = `e2e-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const createResp = await apiContext.post(`${BASE_URL}/api/e2e/create-user`, {
        data: { uuid: userBUuid, password: 'e2e-password' },
      })
      if (!createResp.ok()) {
        throw new Error(`Failed to create User B: ${createResp.status()}`)
      }

      await loginAs(page, userBUuid, 'e2e-password')

      // === Phase 5: Import via UI (User B) ===
      await page.goto('/settings/data')

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByTestId('import-data-button').click(),
      ])
      await fileChooser.setFiles(filePath)

      // Wait for import to complete (inline success Alert replaces legacy alert())
      await expect(page.getByText('Contacts imported successfully.')).toBeVisible({ timeout: 30000 })

      // === Phase 6: Verify in UI (User B) ===
      const contactsList = new ContactsListPage(page)
      await contactsList.goto()

      // Verify imported contacts are visible
      // (User B also has auto-created "Test Contact" entries, so total > 3)
      await contactsList.expectContactVisible('Bob Johnson')
      await contactsList.expectContactVisible('Carol Williams')
      await contactsList.expectContactVisible('Aleksei')

      // Click on the main contact
      await contactsList.clickContact('Aleksei')

      // Wait for contact details page to load
      await expect(page).toHaveURL(/\/contacts\/\d+/)

      const body = page.locator('body')

      // Names
      await expect(body).toContainText('Aleksei')
      await expect(body).toContainText('Ivanov')
      await expect(body).toContainText('Smith')

      // Emails
      await expect(body).toContainText('alex@example.com')
      await expect(body).toContainText('alex.work@example.com')

      // Dates
      await expect(body).toContainText('Birthday')
      await expect(body).toContainText('Anniversary')

      // Addresses
      await expect(body).toContainText('123 Main St')
      await expect(body).toContainText('456 Oak Ave')

      // Organizations
      await expect(body).toContainText('Acme Corp')
      await expect(body).toContainText('Tech Inc')

      // Biographies
      await expect(body).toContainText('Software engineer')
      await expect(body).toContainText('Loves hiking')

      // Relations
      await expect(body).toContainText('Bob Johnson')
      await expect(body).toContainText('Carol Williams')
    } finally {
      // Cleanup: delete User B
      if (userBUuid) {
        try {
          await apiContext.delete(`${BASE_URL}/api/e2e/user/${userBUuid}`)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  })
})
