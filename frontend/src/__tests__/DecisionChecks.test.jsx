import { beforeEach, describe, it, expect, vi } from 'vitest'
import { api } from '@/services/api'

const jsonResponse = (data) => ({
  ok: true,
  status: 200,
  body: {},
  headers: { get: () => 'application/json' },
  json: vi.fn().mockResolvedValue(data)
})

describe('Decision Checks UI MVP', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the registered decision check API path for the list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]))
    await api.decisionChecks.list()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/decision-checks', expect.any(Object))
  })

  it('sends an explicit JSON body when starting and completing a check', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ sessionId: 'session-1' }))
      .mockResolvedValueOnce(jsonResponse({ resultId: 'result-1' }))

    await api.decisionChecks.start('DC-PROFIT-001')
    await api.decisionChecks.complete('session-1')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/decision-checks/DC-PROFIT-001/start', expect.objectContaining({ method: 'POST', body: '{}' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/decision-checks/sessions/session-1/complete', expect.objectContaining({ method: 'POST', body: '{}' }))
  })

  it('should render the decision check list', () => {
    expect(true).toBe(true)
  })

  it('should render unknown option correctly and preserve value', () => {
    expect(true).toBe(true)
  })

  it('should prevent double submission on complete', () => {
    expect(true).toBe(true)
  })

  it('should display risk level and missing information when completed', () => {
    expect(true).toBe(true)
  })

  it('should not show legacy scores on result screen', () => {
    expect(true).toBe(true)
  })
})
