import { test } from '../fixtures/auth.fixture'
import { DashboardPage } from '../pages/DashboardPage'

test.describe('Dashboard @dashboard @smoke', () => {
  test('should display stats widget', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage)
    await dashboard.goto()
    await dashboard.expectLoaded()

    await dashboard.expectWidget('stats')
  })

  test('should display groups widget with group names', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage)
    await dashboard.goto()
    await dashboard.expectLoaded()

    await dashboard.expectWidget('groups')
    await dashboard.expectWidgetContains('groups', 'Family')
  })

  test('should display recent logins widget', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage)
    await dashboard.goto()
    await dashboard.expectLoaded()

    await dashboard.expectWidget('recent-logins')
  })

  test('should display recent audit logs widget', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage)
    await dashboard.goto()
    await dashboard.expectLoaded()

    await dashboard.expectWidget('recent-audit-logs')
  })
})
