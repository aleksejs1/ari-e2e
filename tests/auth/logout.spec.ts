import { test, expect } from '../fixtures/auth.fixture'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Logout @smoke @critical', () => {
  test('should logout and redirect to login page', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage)
    await dashboard.expectLoaded()
    await dashboard.logout()

    // Should redirect to login page
    await expect(authenticatedPage).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
