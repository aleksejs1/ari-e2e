import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'

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

function extractId(iri: string): string {
  const id = iri.split('/').pop()
  if (!id) throw new Error(`Cannot extract id from IRI: ${iri}`)
  return id
}

test.describe('Relationship Playbooks @contacts @critical', () => {
  test('should activate a playbook via the wizard', async ({ userContext }) => {
    const { uuid, password, token, page, apiContext } = userContext

    // Create a contact via API
    const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Playbook', family: 'Tester' }],
    })
    const contactId = extractId(contact['@id'] as string)

    await loginAs(page, uuid, password)
    await page.goto(`/contacts/${contactId}`)
    await expect(page).toHaveURL(/\/contacts\/\d+/)

    // Playbook section rendered — no active playbook yet
    const section = page.getByTestId('playbook-section')
    await expect(section).toBeVisible()

    // Click "Add Playbook" button to open wizard
    await section.getByRole('button', { name: 'Add Playbook' }).click()

    // Wizard dialog opens at Step 1 — select goal
    const wizard = page.getByTestId('playbook-wizard')
    await expect(wizard).toBeVisible()

    // Select the "Maintain" goal
    await page.getByTestId('goal-card-maintain').click()

    // Step 2 — select a preset (pick the first one available)
    await expect(page.locator('[data-testid^="preset-card-"]').first()).toBeVisible()
    await page.locator('[data-testid^="preset-card-"]').first().click()

    // Step 3 — select a "why" tag and submit
    await page.getByTestId('why-tag-inspires_me').click()
    await page.getByTestId('wizard-submit-button').click()

    // Wizard closes and playbook section refreshes
    await expect(wizard).not.toBeVisible()

    // Goal badge confirms the playbook is active
    await expect(page.getByTestId('playbook-goal-badge')).toBeVisible()
    await expect(page.getByTestId('playbook-goal-badge')).toContainText('Maintain')

    // Task list is rendered (may have tasks or the empty-state placeholder)
    await expect(page.getByTestId('playbook-task-list')).toBeVisible()
  })

  test('should pause and resume a playbook', async ({ userContext }) => {
    const { uuid, password, token, page, apiContext } = userContext

    // Create a contact and activate a playbook via API
    const contact = await apiPost(apiContext, `${BASE_URL}/api/contacts`, token, {
      contactNames: [{ given: 'Pause', family: 'Tester' }],
    })
    const contactId = extractId(contact['@id'] as string)

    await apiPost(apiContext, `${BASE_URL}/api/contacts/${contactId}/playbook`, token, {
      preset: 'maintain_friend',
      whyTags: ['inspires_me'],
      whyText: null,
    })

    await loginAs(page, uuid, password)
    await page.goto(`/contacts/${contactId}`)
    await expect(page).toHaveURL(/\/contacts\/\d+/)

    // Playbook is active — Pause button is visible
    const pauseButton = page.getByRole('button', { name: 'Pause playbook' })
    await expect(pauseButton).toBeVisible()

    // Pause the playbook
    await pauseButton.click()

    // "Paused" badge appears and Resume button is now shown
    await expect(page.getByText('Paused')).toBeVisible()
    const resumeButton = page.getByRole('button', { name: 'Resume playbook' })
    await expect(resumeButton).toBeVisible()

    // Resume the playbook
    await resumeButton.click()

    // Paused badge disappears and Pause button is back
    await expect(page.getByText('Paused')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause playbook' })).toBeVisible()
  })
})
