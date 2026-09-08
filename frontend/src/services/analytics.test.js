import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_CONSENT_KEY,
  captureAnalytics,
  normalizeAnalyticsRoute,
  resetAnalyticsForTests,
  sanitizeAnalyticsProperties
} from './analytics'

const { capture, init } = vi.hoisted(() => ({ capture: vi.fn(), init: vi.fn() }))

vi.mock('posthog-js', () => ({
  default: { init, capture, identify: vi.fn(), reset: vi.fn(), opt_out_capturing: vi.fn() }
}))

describe('privacy-first analytics', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAnalyticsForTests()
    capture.mockReset()
    init.mockReset()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analytics: { enabled: true, projectToken: 'phc_public', host: 'https://eu.i.posthog.com' } })
    })
  })

  it('does not initialize or capture before explicit consent', async () => {
    expect(await captureAnalytics('page_view', { route: '/app/dashboard' })).toBe(false)
    expect(init).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })

  it('removes financial, personal and free-text properties', () => {
    expect(sanitizeAnalyticsProperties({
      route: '/app/dashboard',
      amount: 120000,
      email: 'person@example.com',
      message: 'sensitive mentor text',
      integration_type: 'trendyol',
      outcome: 'succeeded'
    })).toEqual({ route: '/app/dashboard', integration_type: 'trendyol', outcome: 'succeeded' })
  })

  it('replaces dynamic route identifiers', () => {
    expect(normalizeAnalyticsRoute('/app/workspaces/5b751bf7-d568-47b7-a30e-03c7e422a6bd/orders'))
      .toBe('/app/workspaces/:workspaceId/orders')
    expect(normalizeAnalyticsRoute('/app/profil/42')).toBe('/app/profil/:userId')
  })

  it('captures only allowlisted properties after consent', async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted')
    expect(await captureAnalytics('sync_succeeded', {
      integration_type: 'trendyol',
      sync_mode: 'manual',
      customer_name: 'should never leave',
      order_count: 17
    })).toBe(true)
    expect(capture).toHaveBeenCalledWith('sync_succeeded', {
      integration_type: 'trendyol',
      sync_mode: 'manual'
    })
  })
})
