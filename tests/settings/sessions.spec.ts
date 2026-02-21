import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sessions @settings', () => {
  test('should display active sessions page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings/sessions')

    await expect(authenticatedPage.getByTestId('sessions-list')).toBeVisible()
  })

  test('should display login history page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings/login-history')

    await expect(authenticatedPage.getByTestId('login-history-list')).toBeVisible()
  })
})
