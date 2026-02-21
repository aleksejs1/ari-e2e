import { test, expect } from '../fixtures/user-context.fixture'
import { loginAs } from '../helpers/auth.helper'
import { GroupFormPage } from '../pages/GroupFormPage'
import { GroupsListPage } from '../pages/GroupsListPage'

test.describe('Groups CRUD @groups @crud @critical', () => {
  test('should create a new group', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const groupsList = new GroupsListPage(page)
    await groupsList.goto()

    await groupsList.clickCreate()

    const groupForm = new GroupFormPage(page)
    await groupForm.expectVisible()
    await groupForm.fillName('New Group')
    await groupForm.save()

    // Wait for dialog to close
    await expect(page.getByTestId('group-form-dialog')).toBeHidden()

    // Verify group appears in list
    await groupsList.expectGroupVisible('New Group')
  })

  test('should delete a group', async ({ userContext }) => {
    const { page, uuid, password } = userContext

    await loginAs(page, uuid, password)

    const groupsList = new GroupsListPage(page)
    await groupsList.goto()

    // First create a group to delete
    await groupsList.clickCreate()
    const groupForm = new GroupFormPage(page)
    await groupForm.expectVisible()
    await groupForm.fillName('GroupToDelete')
    await groupForm.save()
    await expect(page.getByTestId('group-form-dialog')).toBeHidden()
    await groupsList.expectGroupVisible('GroupToDelete')

    // Handle window.confirm() dialog
    page.on('dialog', (dialog) => void dialog.accept())

    // Delete the group
    await groupsList.deleteGroup('GroupToDelete')

    // Verify group is gone
    await expect(async () => {
      await groupsList.expectGroupNotVisible('GroupToDelete')
    }).toPass({ timeout: 5000 })
  })
})
