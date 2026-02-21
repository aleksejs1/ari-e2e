const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8026'

export interface MailpitMessage {
  ID: string
  MessageID: string
  From: { Name: string; Address: string }
  To: { Name: string; Address: string }[]
  Subject: string
  Snippet: string
  Created: string
}

export async function getMessages(): Promise<MailpitMessage[]> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`)
  if (!response.ok) {
    throw new Error(`Mailpit API error: ${response.status}`)
  }
  const data = await response.json()
  return data.messages ?? []
}

export async function clearMessages(): Promise<void> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Mailpit API error: ${response.status}`)
  }
}

export async function waitForMessage(options: {
  to?: string
  subject?: string
  timeout?: number
}): Promise<MailpitMessage> {
  const { to, subject, timeout = 15000 } = options
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const messages = await getMessages()

    const match = messages.find((msg) => {
      if (to && !msg.To.some((r) => r.Address === to)) {
        return false
      }
      if (subject && !msg.Subject.includes(subject)) {
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
    `No matching message found within ${timeout}ms (to=${to}, subject=${subject})`,
  )
}
