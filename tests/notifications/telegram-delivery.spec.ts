import { test, expect } from '../fixtures/user-context.fixture'
import {
  resetTelegramMock,
  waitForTelegramMessage,
} from '../helpers/mock-telegram.helper'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081'
const TELEGRAM_CHAT_ID = '99999'

test.describe('Telegram Notification Delivery @notifications @telegram', () => {
  test('should deliver telegram notification', async ({ userContext }) => {
    const { token, apiContext, userId } = userContext

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/ld+json',
    }

    // 1. Reset Telegram mock
    await resetTelegramMock()

    // Use today's date so the notification triggers
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const birthdayDate = `1990-${month}-${day}`
    const generateDate = `${today.getFullYear()}-${month}-${day}`

    // 2. Create a contact with birthday matching today
    const contactResponse = await apiContext.post(`${BASE_URL}/api/contacts`, {
      headers,
      data: {
        contactNames: [{ given: 'Telegram', family: 'TestPerson' }],
        contactDates: [{ date: birthdayDate, text: 'Birthday' }],
      },
    })
    if (!contactResponse.ok()) {
      const body = await contactResponse.text()
      throw new Error(`create contact failed: ${contactResponse.status()} — ${body}`)
    }

    // 3. Create a telegram notification channel
    const channelResponse = await apiContext.post(
      `${BASE_URL}/api/notification_channels`,
      {
        headers,
        data: {
          type: 'telegram',
          config: {},
        },
      },
    )
    if (!channelResponse.ok()) {
      const body = await channelResponse.text()
      throw new Error(`create channel failed: ${channelResponse.status()} — ${body}`)
    }
    const channelData = await channelResponse.json()
    const channelId = channelData.id
    if (!channelId) {
      throw new Error(
        `Channel created but no id in response: ${JSON.stringify(channelData)}`,
      )
    }

    // 4. Simulate Telegram /start webhook to link chatId
    const webhookResponse = await apiContext.post(
      `${BASE_URL}/api/webhook/telegram`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          message: {
            text: `/start ${userId}_${channelId}`,
            chat: { id: Number(TELEGRAM_CHAT_ID) },
          },
        },
      },
    )
    if (!webhookResponse.ok()) {
      const body = await webhookResponse.text()
      throw new Error(`webhook/telegram failed: ${webhookResponse.status()} — ${body}`)
    }

    // 5. Force-verify the channel via E2E API
    const verifyResponse = await apiContext.post(
      `${BASE_URL}/api/e2e/verify-channel/${channelId}`,
    )
    if (!verifyResponse.ok()) {
      const body = await verifyResponse.text()
      throw new Error(`verify-channel failed: ${verifyResponse.status()} — ${body}`)
    }

    // 6. Create a notification policy targeting the telegram channel
    const policyResponse = await apiContext.post(
      `${BASE_URL}/api/notification-policies`,
      {
        headers,
        data: {
          name: 'Telegram Birthday Policy',
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
      },
    )
    if (!policyResponse.ok()) {
      const body = await policyResponse.text()
      throw new Error(`create policy failed: ${policyResponse.status()} — ${body}`)
    }

    // 7. Generate notifications for today
    const generateResponse = await apiContext.post(
      `${BASE_URL}/api/e2e/exec-command`,
      {
        data: {
          command: 'ari:notification:generate',
          args: { date: generateDate },
        },
      },
    )
    const generateBody = await generateResponse.json()
    if (!generateResponse.ok() || generateBody.status !== 'ok') {
      throw new Error(`generate failed: ${JSON.stringify(generateBody)}`)
    }

    // 8. Process notifications (sends to Telegram)
    const processResponse = await apiContext.post(
      `${BASE_URL}/api/e2e/exec-command`,
      {
        data: {
          command: 'ari:notification:process',
        },
      },
    )
    const processBody = await processResponse.json()
    if (!processResponse.ok() || processBody.status !== 'ok') {
      throw new Error(`process failed: ${JSON.stringify(processBody)}`)
    }

    // 9. Verify Telegram mock received the message
    const message = await waitForTelegramMessage({
      chatId: TELEGRAM_CHAT_ID,
      timeout: 15000,
    })

    expect(message).toBeTruthy()
    expect(message.chatId).toBe(TELEGRAM_CHAT_ID)
    expect(message.text).toBeTruthy()
  })
})
