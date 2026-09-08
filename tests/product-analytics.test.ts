import { describe, expect, it } from 'vitest'
import { sanitizeProductAnalyticsProperties } from '../src/services/product-analytics'

describe('product analytics privacy contract', () => {
  it('keeps operational dimensions and removes business data', () => {
    expect(sanitizeProductAnalyticsProperties({
      integration_type: 'trendyol',
      sync_mode: 'scheduled',
      outcome: 'succeeded',
      amount: 125_000,
      revenue: 800_000,
      customer_email: 'person@example.com',
      order_id: 'order-42',
      message: 'raw provider response'
    })).toEqual({
      integration_type: 'trendyol',
      sync_mode: 'scheduled',
      outcome: 'succeeded'
    })
  })
})
