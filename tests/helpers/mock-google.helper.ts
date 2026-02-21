const MOCK_GOOGLE_URL = process.env.MOCK_GOOGLE_URL ?? 'http://localhost:4020'

export async function resetGoogleMock(): Promise<void> {
  const response = await fetch(`${MOCK_GOOGLE_URL}/__admin/reset`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to reset Google mock: ${response.status}`)
  }
}

export async function getGoogleCalls(): Promise<
  Array<{ endpoint: string; timestamp: string }>
> {
  const response = await fetch(`${MOCK_GOOGLE_URL}/__admin/calls`)
  if (!response.ok) {
    throw new Error(`Failed to get Google mock calls: ${response.status}`)
  }
  const data = await response.json()
  return data.calls ?? []
}
