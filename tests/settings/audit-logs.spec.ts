import { test, expect } from '../fixtures/auth.fixture'

test.describe('Audit Logs @settings', () => {
  test('should display audit logs with entries', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings/audit-logs')

    await expect(authenticatedPage.getByTestId('audit-logs-list')).toBeVisible()
  })
})
