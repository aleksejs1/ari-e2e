import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { NotificationChannelFormPage } from '../pages/NotificationChannelFormPage'
import { NotificationChannelsPage } from '../pages/NotificationChannelsPage'

test.describe('Notification Channels CRUD @notifications @crud', () => {
  test('should create an email notification channel', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const channelsPage = new NotificationChannelsPage(page)
    await channelsPage.goto()

    await channelsPage.clickAdd()

    const formPage = new NotificationChannelFormPage(page)
    await formPage.expectVisible()
    await formPage.selectType('email')
    await formPage.fillEmail('test-channel@example.com')
    await formPage.save()

    // Wait for sheet to close
    await expect(page.locator('[role="dialog"]')).toBeHidden()

    // Verify channel appears in list
    await channelsPage.expectChannelVisible('email')
  })

  test('should create a web notification channel', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const channelsPage = new NotificationChannelsPage(page)
    await channelsPage.goto()

    await channelsPage.clickAdd()

    const formPage = new NotificationChannelFormPage(page)
    await formPage.expectVisible()
    await formPage.selectType('web')
    await formPage.save()

    // Wait for sheet to close
    await expect(page.locator('[role="dialog"]')).toBeHidden()

    // Verify channel appears in list
    await channelsPage.expectChannelVisible('web')
  })

  test('should delete a notification channel', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const channelsPage = new NotificationChannelsPage(page)
    await channelsPage.goto()

    // First create a channel to delete
    await channelsPage.clickAdd()
    const formPage = new NotificationChannelFormPage(page)
    await formPage.expectVisible()
    await formPage.selectType('web')
    await formPage.save()
    await expect(page.locator('[role="dialog"]')).toBeHidden()
    await channelsPage.expectChannelVisible('web')

    // Handle window.confirm() dialog
    page.on('dialog', (dialog) => void dialog.accept())

    // Delete the channel
    await channelsPage.deleteChannel('web')

    // Verify channel is gone
    await expect(async () => {
      await channelsPage.expectChannelNotVisible('web')
    }).toPass({ timeout: 5000 })
  })
})
