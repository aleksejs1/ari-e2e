import { test, expect } from '../fixtures/user-context.fixture'
import { clearMessages, waitForMessage } from '../helpers/mailpit.helper'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'

test.describe('Notification Delivery @notifications @delivery @critical', () => {
  test('should deliver email notification for birthday event', async ({ userContext }) => {
    const { token, apiContext, email } = userContext

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/ld+json',
    }

    // Use today's date so scheduledAt <= NOW() and process command picks it up
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const birthdayDate = `1990-${month}-${day}`
    const generateDate = `${today.getFullYear()}-${month}-${day}`

    // 1. Create a contact with birthday matching today's month-day
    const contactResponse = await apiContext.post(`${BASE_URL}/api/contacts`, {
      headers,
      data: {
        contactNames: [{ given: 'Birthday', family: 'TestPerson' }],
        contactDates: [{ date: birthdayDate, text: 'Birthday' }],
      },
    })
    if (!contactResponse.ok()) {
      const body = await contactResponse.text()
      throw new Error(`create contact failed: ${contactResponse.status()} — ${body}`)
    }

    // 2. Create an email notification channel
    const channelResponse = await apiContext.post(`${BASE_URL}/api/notification_channels`, {
      headers,
      data: {
        type: 'email',
        config: { email },
      },
    })
    if (!channelResponse.ok()) {
      const body = await channelResponse.text()
      throw new Error(`create channel failed: ${channelResponse.status()} — ${body}`)
    }
    const channelData = await channelResponse.json()
    // API Platform returns numeric `id` in the response body
    const channelId = channelData.id
    if (!channelId) {
      throw new Error(`Channel created but no id in response: ${JSON.stringify(channelData)}`)
    }

    // 3. Force-verify the channel via E2E API
    const verifyResponse = await apiContext.post(
      `${BASE_URL}/api/e2e/verify-channel/${channelId}`,
    )
    if (!verifyResponse.ok()) {
      const body = await verifyResponse.text()
      throw new Error(
        `verify-channel failed: ${verifyResponse.status()} ${verifyResponse.statusText()} — ${body}`,
      )
    }

    // 4. Create a notification policy targeting the email channel
    const policyResponse = await apiContext.post(`${BASE_URL}/api/notification-policies`, {
      headers,
      data: {
        name: 'E2E Birthday Policy',
        targets: { type: 'all' },
        eventTypes: ['Birthday'],
        schedule: [
          {
            offsetDays: 0,
            time: '00:00',
            channels: [channelId],
          },
        ],
      },
    })
    if (!policyResponse.ok()) {
      const body = await policyResponse.text()
      throw new Error(`create policy failed: ${policyResponse.status()} — ${body}`)
    }

    // 5. Clear Mailpit inbox
    await clearMessages()

    // 6. Generate notifications for today's date
    const generateResponse = await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: {
        command: 'ari:notification:generate',
        args: { date: generateDate },
      },
    })
    const generateBody = await generateResponse.json()
    if (!generateResponse.ok() || generateBody.status !== 'ok') {
      throw new Error(`generate failed: ${JSON.stringify(generateBody)}`)
    }

    // 7. Process notifications (sends emails)
    const processResponse = await apiContext.post(`${BASE_URL}/api/e2e/exec-command`, {
      data: {
        command: 'ari:notification:process',
      },
    })
    const processBody = await processResponse.json()
    if (!processResponse.ok() || processBody.status !== 'ok') {
      throw new Error(`process failed: ${JSON.stringify(processBody)}`)
    }

    // 8. Verify email was received in Mailpit
    const message = await waitForMessage({
      to: email,
      timeout: 15000,
    })

    expect(message).toBeTruthy()
    expect(message.To.some((r) => r.Address === email)).toBeTruthy()
  })
})
