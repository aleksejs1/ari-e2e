const MOCK_TELEGRAM_URL = process.env.MOCK_TELEGRAM_URL ?? 'http://localhost:4021'

export interface TelegramMessage {
  chatId: string
  text: string
  timestamp: string
}

export async function resetTelegramMock(): Promise<void> {
  const response = await fetch(`${MOCK_TELEGRAM_URL}/__admin/reset`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to reset Telegram mock: ${response.status}`)
  }
}

export async function getTelegramMessages(): Promise<TelegramMessage[]> {
  const response = await fetch(`${MOCK_TELEGRAM_URL}/__admin/messages`)
  if (!response.ok) {
    throw new Error(`Failed to get Telegram mock messages: ${response.status}`)
  }
  const data = await response.json()
  return data.messages ?? []
}

export async function waitForTelegramMessage(options: {
  chatId?: string
  timeout?: number
}): Promise<TelegramMessage> {
  const { chatId, timeout = 15000 } = options
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const messages = await getTelegramMessages()

    const match = messages.find((msg) => {
      if (chatId && msg.chatId !== chatId) {
        return false
      }
      return true
    })

    if (match) {
      return match
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(
    `No matching Telegram message found within ${timeout}ms (chatId=${chatId})`,
  )
}
