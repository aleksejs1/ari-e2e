import express from 'express'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

interface CallLogEntry {
  endpoint: string
  timestamp: string
  body?: unknown
}

const callLog: CallLogEntry[] = []

// OAuth: Authorization redirect
app.get('/o/oauth2/v2/auth', (req, res) => {
  callLog.push({ endpoint: 'auth', timestamp: new Date().toISOString() })
  const redirectUri = req.query.redirect_uri as string
  const state = req.query.state as string
  res.redirect(`${redirectUri}?code=mock-auth-code&state=${state}`)
})

// OAuth: Token exchange
app.post('/token', (req, res) => {
  callLog.push({ endpoint: 'token', timestamp: new Date().toISOString(), body: req.body })
  res.json({
    access_token: 'mock-access-token-' + Date.now(),
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    scope: 'https://www.googleapis.com/auth/contacts',
    token_type: 'Bearer',
  })
})

// People API: List connections
app.get('/v1/people/me/connections', (_req, res) => {
  callLog.push({ endpoint: 'connections', timestamp: new Date().toISOString() })
  res.json({
    connections: [
      {
        resourceName: 'people/mock-1',
        metadata: { sources: [{ type: 'CONTACT' }] },
        names: [{ givenName: 'Google', familyName: 'Contact1' }],
        emailAddresses: [{ value: 'google1@mock.com' }],
        phoneNumbers: [{ value: '+1-555-9901' }],
      },
      {
        resourceName: 'people/mock-2',
        metadata: { sources: [{ type: 'CONTACT' }] },
        names: [{ givenName: 'Google', familyName: 'Contact2' }],
        emailAddresses: [{ value: 'google2@mock.com' }],
      },
      {
        resourceName: 'people/mock-3',
        metadata: { sources: [{ type: 'CONTACT' }] },
        names: [{ givenName: 'Google', familyName: 'Contact3' }],
      },
    ],
    totalPeople: 3,
    totalItems: 3,
  })
})

// People API: Get single person
app.get('/v1/people/:resourceName', (req, res) => {
  callLog.push({ endpoint: 'person', timestamp: new Date().toISOString() })
  const id = req.params.resourceName
  res.json({
    resourceName: `people/${id}`,
    metadata: { sources: [{ type: 'CONTACT' }] },
    names: [{ givenName: 'Google', familyName: `Contact-${id}` }],
    emailAddresses: [{ value: `${id}@mock.com` }],
  })
})

// Contact Groups API
app.get('/v1/contactGroups', (_req, res) => {
  callLog.push({ endpoint: 'contactGroups', timestamp: new Date().toISOString() })
  res.json({
    contactGroups: [
      {
        resourceName: 'contactGroups/mock-group-1',
        name: 'Mock Group',
        groupType: 'USER_CONTACT_GROUP',
        memberCount: 2,
      },
    ],
  })
})

// Admin: Get call log
app.get('/__admin/calls', (_req, res) => {
  res.json({ calls: callLog })
})

// Admin: Reset call log
app.post('/__admin/reset', (_req, res) => {
  callLog.length = 0
  res.json({ status: 'ok' })
})

const PORT = 4010
app.listen(PORT, () => {
  console.log(`Mock Google server running on port ${PORT}`)
})
