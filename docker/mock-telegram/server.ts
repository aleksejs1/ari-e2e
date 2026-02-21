import express from 'express'

const app = express()
app.use(express.json())

interface SentMessage {
  chatId: string
  text: string
  timestamp: string
}

const sentMessages: SentMessage[] = []

// Telegram Bot API: sendMessage
app.post('/bot:token/sendMessage', (req, res) => {
  const { chat_id, text } = req.body
  sentMessages.push({
    chatId: String(chat_id),
    text: String(text),
    timestamp: new Date().toISOString(),
  })
  res.json({
    ok: true,
    result: {
      message_id: sentMessages.length,
      from: { id: 123456789, is_bot: true, first_name: 'AriBot' },
      chat: { id: Number(chat_id), type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  })
})

// Telegram Bot API: getMe
app.get('/bot:token/getMe', (_req, res) => {
  res.json({
    ok: true,
    result: {
      id: 123456789,
      is_bot: true,
      first_name: 'AriBot',
      username: 'ari_e2e_bot',
    },
  })
})

// Telegram Bot API: setWebhook
app.post('/bot:token/setWebhook', (_req, res) => {
  res.json({ ok: true, result: true, description: 'Webhook was set' })
})

// Admin: Get sent messages
app.get('/__admin/messages', (_req, res) => {
  res.json({ messages: sentMessages })
})

// Admin: Reset messages
app.post('/__admin/reset', (_req, res) => {
  sentMessages.length = 0
  res.json({ status: 'ok' })
})

const PORT = 4011
app.listen(PORT, () => {
  console.log(`Mock Telegram server running on port ${PORT}`)
})
