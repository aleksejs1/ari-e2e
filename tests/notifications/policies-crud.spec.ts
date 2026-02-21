import { test as userTest, expect as userExpect } from '../fixtures/user-context.fixture'
import { test as authTest } from '../fixtures/auth.fixture'
import { loginAs } from '../helpers/auth.helper'
import { SEEDED_NOTIFICATIONS } from '../fixtures/test-data'
import { NotificationChannelFormPage } from '../pages/NotificationChannelFormPage'
import { NotificationChannelsPage } from '../pages/NotificationChannelsPage'
import { NotificationPoliciesPage } from '../pages/NotificationPoliciesPage'
import { NotificationPolicyFormPage } from '../pages/NotificationPolicyFormPage'

async function createWebChannel(page: import('@playwright/test').Page) {
  const channelsPage = new NotificationChannelsPage(page)
  await channelsPage.goto()
  await channelsPage.clickAdd()
  const formPage = new NotificationChannelFormPage(page)
  await formPage.expectVisible()
  await formPage.selectType('web')
  await formPage.save()
  await userExpect(page.locator('[role="dialog"]')).toBeHidden()
}

userTest.describe('Notification Policies CRUD @notifications @crud', () => {
  userTest('should create a notification policy', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    // Must create a channel first so the policy form has a channel to select
    await createWebChannel(page)

    const policiesPage = new NotificationPoliciesPage(page)
    await policiesPage.goto()

    await policiesPage.clickCreate()

    const formPage = new NotificationPolicyFormPage(page)
    await formPage.fillName('Test Policy')
    // "all" target type is pre-selected by default
    // Select the web channel in the schedule section
    await page.getByLabel(/web\s*-/i).check()
    await formPage.save()

    // Should redirect to policies list
    await page.waitForURL(/\/settings\/notification-policies$/, { timeout: 10000 })

    // Verify policy appears in list
    await policiesPage.expectPolicyVisible('Test Policy')
  })

  userTest('should delete a notification policy', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    // Must create a channel first so the policy form has a channel to select
    await createWebChannel(page)

    const policiesPage = new NotificationPoliciesPage(page)
    await policiesPage.goto()

    // First create a policy to delete
    await policiesPage.clickCreate()
    const formPage = new NotificationPolicyFormPage(page)
    await formPage.fillName('PolicyToDelete')
    await page.getByLabel(/web\s*-/i).check()
    await formPage.save()
    await page.waitForURL(/\/settings\/notification-policies$/, { timeout: 10000 })
    await policiesPage.expectPolicyVisible('PolicyToDelete')

    // Handle window.confirm() dialog
    page.on('dialog', (dialog) => void dialog.accept())

    // Delete the policy
    await policiesPage.deletePolicy('PolicyToDelete')

    // Verify policy is gone
    await userExpect(async () => {
      await policiesPage.expectPolicyNotVisible('PolicyToDelete')
    }).toPass({ timeout: 5000 })
  })
})

authTest.describe('Notification Policies Seeded @notifications', () => {
  authTest('should display seeded notification policy', async ({ authenticatedPage }) => {
    const policiesPage = new NotificationPoliciesPage(authenticatedPage)
    await policiesPage.goto()

    await policiesPage.expectPolicyVisible(SEEDED_NOTIFICATIONS.userA.policy.name)
  })
})
