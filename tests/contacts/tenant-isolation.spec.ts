import { test, expect } from '../fixtures/auth-userb.fixture'
import { ContactsListPage } from '../pages/ContactsListPage'
import { GroupsListPage } from '../pages/GroupsListPage'

test.describe('Tenant Isolation @isolation @critical', () => {
  test('User A sees own contacts, not User B contacts', async ({ authenticatedPage }) => {
    const contactsList = new ContactsListPage(authenticatedPage)
    await contactsList.goto()

    await contactsList.expectContactVisible('John Doe')
    await contactsList.expectContactNotVisible('Secret Person')
  })

  test('User B sees own contacts, not User A contacts', async ({ authenticatedPageB }) => {
    const contactsList = new ContactsListPage(authenticatedPageB)
    await contactsList.goto()

    await contactsList.expectContactVisible('Secret Person')
    await contactsList.expectContactNotVisible('John Doe')
  })

  test('User A sees own groups, not User B groups', async ({ authenticatedPage }) => {
    const groupsList = new GroupsListPage(authenticatedPage)
    await groupsList.goto()

    await groupsList.expectGroupVisible('Family')
    await groupsList.expectGroupNotVisible('Private Group')
  })

  test('User B sees own groups, not User A groups', async ({ authenticatedPageB }) => {
    const groupsList = new GroupsListPage(authenticatedPageB)
    await groupsList.goto()

    await groupsList.expectGroupVisible('Private Group')
    await groupsList.expectGroupNotVisible('Family')
  })
})
