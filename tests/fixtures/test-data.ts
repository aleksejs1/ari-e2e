export const TEST_USERS = {
  userA: {
    uuid: 'e2e-user',
    password: 'e2e-password',
  },
  userB: {
    uuid: 'e2e-user-b',
    password: 'e2e-password',
  },
  admin: {
    uuid: 'e2e-admin',
    password: 'e2e-password',
  },
} as const

export const SEEDED_CONTACTS = {
  userA: [
    { given: 'John', family: 'Doe', email: 'john.doe@example.com' },
    { given: 'Jane', family: 'Smith', email: 'jane.smith@example.com' },
    { given: 'Bob', family: 'Wilson', email: 'bob.wilson@example.com' },
    { given: 'Test1', family: 'Contact1', email: 'test1@example.com' },
    { given: 'Test2', family: 'Contact2', email: 'test2@example.com' },
    { given: 'Test3', family: 'Contact3', email: 'test3@example.com' },
    { given: 'Test4', family: 'Contact4', email: 'test4@example.com' },
    { given: 'Test5', family: 'Contact5', email: 'test5@example.com' },
    { given: 'Test6', family: 'Contact6', email: 'test6@example.com' },
    { given: 'Test7', family: 'Contact7', email: 'test7@example.com' },
  ],
  userB: [
    { given: 'Secret', family: 'Person', email: 'secret@example.com' },
  ],
} as const

export const SEEDED_GROUPS = {
  userA: [
    { name: 'Family', color: '#ef4444' },
    { name: 'Work', color: '#3b82f6' },
    { name: 'Friends', color: '#22c55e' },
  ],
  userB: [
    { name: 'Private Group', color: '#a855f7' },
  ],
} as const

export const MOCK_GOOGLE = {
  contacts: [
    { given: 'Google', family: 'Contact-mock-1' },
    { given: 'Google', family: 'Contact-mock-2' },
    { given: 'Google', family: 'Contact-mock-3' },
  ],
  count: 3,
} as const

export const SEEDED_NOTIFICATIONS = {
  userA: {
    channel: { type: 'web' },
    policy: { name: 'Birthday Reminders' },
  },
} as const
