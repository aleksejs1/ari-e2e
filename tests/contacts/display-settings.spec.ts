import { type APIRequestContext } from '@playwright/test'

import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { ContactsListPage } from '../pages/ContactsListPage'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

async function apiPost(
  apiContext: APIRequestContext,
  url: string,
  token: string,
  data: unknown,
): Promise<Record<string, unknown>> {
  const resp = await apiContext.post(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  })
  if (!resp.ok()) {
    throw new Error(`POST ${url} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json()
}

/** Wait for a PATCH/PUT to /user_prefs and resolve after it completes. */
function waitForPrefsSave(page: import('@playwright/test').Page) {
  return page.waitForResponse(
    (resp) => resp.url().includes('/user_prefs') && resp.request().method() !== 'GET',
    { timeout: 15000 },
  )
}

test.describe('Display settings — column variants @contacts @critical', () => {
  test('should add a typed phone column, persist after reload, and show in card view', async ({
    userContext,
  }) => {
    const { page, uuid, password, token, apiContext } = userContext

    // === Phase 1: Create test data via API ===
    await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Alice', family: 'Display' }],
      phoneNumbers: [{ value: '+1234567890', type: 'mobile' }],
    })
    await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Bob', family: 'NoPhone' }],
    })

    // === Phase 2: Login and open contacts list ===
    await loginAs(page, uuid, password)
    const contactsList = new ContactsListPage(page)
    await contactsList.goto()
    await contactsList.expectContactVisible('Alice Display')

    // === Phase 3: Open display settings modal ===
    await page.getByTestId('display-settings-button').click()
    await expect(page.getByTestId('display-settings-modal')).toBeVisible()

    // Click the phones section (default, but click to be explicit)
    await page.getByTestId('display-settings-section-phones').click()

    // Wait for the mobile option to appear (API must return variants first)
    const mobileOption = page.getByTestId('display-settings-option-phoneNumbers:mobile')
    await expect(mobileOption).toBeVisible({ timeout: 10000 })
    await mobileOption.click()

    // Verify checkbox is now checked
    await expect(mobileOption.locator('button[role="checkbox"]')).toHaveAttribute(
      'data-state',
      'checked',
    )

    // Save and wait for the user_prefs PATCH to complete
    const save1 = waitForPrefsSave(page)
    await page.getByTestId('display-settings-save').click()
    await save1

    // Modal closes
    await expect(page.getByTestId('display-settings-modal')).toBeHidden()

    // === Phase 4: Verify typed column appears in table ===
    await expect(page.getByRole('columnheader', { name: 'mobile' })).toBeVisible()

    // Alice has a mobile phone — the number should appear in her row
    const aliceRow = page.getByTestId('contact-row').filter({ hasText: 'Alice Display' }).first()
    await expect(aliceRow).toContainText('+1234567890')

    // Bob has no mobile phone — his mobile cell should not contain any digit sequence
    const bobRow = page.getByTestId('contact-row').filter({ hasText: 'Bob NoPhone' }).first()
    await expect(bobRow).not.toContainText('+')

    // === Phase 5: Switch to card view ===
    const save2 = waitForPrefsSave(page)
    await page.getByTestId('view-mode-toggle').click()
    await save2

    // Table is hidden in card view; at least one card is visible
    await expect(page.getByTestId('contact-card').first()).toBeVisible()
    await expect(page.getByTestId('contact-row').first()).toBeHidden()

    // Alice's card should show the typed phone field value
    const aliceCard = page.getByTestId('contact-card').filter({ hasText: 'Alice Display' }).first()
    await expect(aliceCard).toContainText('+1234567890')

    // === Phase 6: Reload and verify persistence ===
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Card view persists — cards are visible, table rows hidden
    await expect(page.getByTestId('contact-card').first()).toBeVisible()
    await expect(page.getByTestId('contact-row').first()).toBeHidden()

    // Switch back to table view to verify typed column also persisted
    const save3 = waitForPrefsSave(page)
    await page.getByTestId('view-mode-toggle').click()
    await save3

    await expect(page.getByRole('columnheader', { name: 'mobile' })).toBeVisible()
  })

  test('should reset typed columns via Reset to defaults', async ({ userContext }) => {
    const { page, uuid, password, token, apiContext } = userContext

    // Create a contact with a phone so the "work" variant is available
    await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Charlie', family: 'Reset' }],
      phoneNumbers: [{ value: '+9876543210', type: 'work' }],
    })

    await loginAs(page, uuid, password)
    const contactsList = new ContactsListPage(page)
    await contactsList.goto()

    // Add a typed column
    await page.getByTestId('display-settings-button').click()
    await page.getByTestId('display-settings-section-phones').click()

    const workOption = page.getByTestId('display-settings-option-phoneNumbers:work')
    await expect(workOption).toBeVisible({ timeout: 10000 })
    await workOption.click()

    const save1 = waitForPrefsSave(page)
    await page.getByTestId('display-settings-save').click()
    await save1

    await expect(page.getByRole('columnheader', { name: 'work' })).toBeVisible()

    // Reopen modal and reset to defaults
    await page.getByTestId('display-settings-button').click()
    await expect(page.getByTestId('display-settings-modal')).toBeVisible()
    await page.getByTestId('display-settings-reset').click()

    const save2 = waitForPrefsSave(page)
    await page.getByTestId('display-settings-save').click()
    await save2

    // The typed column should be gone
    await expect(page.getByRole('columnheader', { name: 'work' })).toBeHidden()
  })
})
